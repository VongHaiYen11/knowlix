import { excerpt, slugify, uniqueCleanStrings, wordCount } from '../../utils/text.js'
import { sourcesRepository } from './sources.repository.js'
import { pool } from '../../database/pool.js'
import { generateIngestSummary, extractKnowledgePages, extractText } from '../../wiki/ingest.js'
import { storageService } from '../../lib/storage.js'
import { embedText } from '../../lib/embeddings.js'
import { defaultAiCustomization, type AiCustomizationProfile } from '../ai-customization/ai-customization.defaults.js'

function readTimeFromContent(content: string) {
  const minutes = Math.max(1, Math.ceil(wordCount(content) / 220))
  return `${minutes} min read`
}

function timelineEvent(action: string, sourceTitle: string, reason?: string) {
  const prefix = action === 'create'
    ? 'Generated'
    : action === 'merge'
      ? 'Merged'
      : action === 'replace'
        ? 'Replaced'
        : action === 'link_only'
          ? 'Linked'
          : 'Updated'
  const detail = reason?.trim()
  return detail ? `${prefix} from ${sourceTitle}: ${detail}` : `${prefix} from ${sourceTitle}`
}

export async function runBackgroundIngest(input: {
  userId: string
  fileId: string
  sourceId: string
  rawStorageObjectId: string
  rawStorageUrl: string
  originalName: string
  created: string
  uploadedType: string
  customization?: AiCustomizationProfile
}) {
  const { userId, fileId, sourceId, rawStorageObjectId, rawStorageUrl, originalName, created, uploadedType } = input
  const customization = input.customization ?? defaultAiCustomization()
  try {
    console.log(`[Ingest] Starting ingest for "${originalName}" (${sourceId})`)
    const raw = await storageService.download({ userId, storageObjectId: rawStorageObjectId })
    
    // 1. Extract text first
    let preExtractedText
    try {
      preExtractedText = await extractText(raw.buffer, originalName)
    } catch (e) {
      console.warn(`[Ingest] Could not pre-extract text:`, e)
    }
    
    // 2. Generate summary from extracted text
    const summary = await generateIngestSummary(raw.buffer, {
      originalName,
      uploadedType,
      preExtractedText,
      customization,
    })

    // 3. Generate embedding for hybrid search using the summary excerpt
    const textSnippet = summary.excerpt || summary.body || preExtractedText?.text?.slice(0, 1000) || originalName
    const fileEmbedding = await embedText(textSnippet).catch(() => [])
    const embeddingStr = `[${fileEmbedding.join(',')}]`
    
    // 4. Find candidates using Hybrid Search (FTS + Vector)
    const candidatesResult = await pool.query(
      `SELECT slug,title,overview,category,knowledge_tags AS tags
       FROM knowledge_entries
       WHERE user_id=$1
       ORDER BY GREATEST(
          ts_rank_cd(COALESCE(search_vector, to_tsvector('simple', title || ' ' || overview || ' ' || array_to_string(knowledge_tags, ' '))), plainto_tsquery('simple', $2)),
          1 - (embedding <=> $3::vector)
       ) DESC, updated_at DESC
       LIMIT 20`,
      [userId, originalName, embeddingStr],
    )
    
    // 5. Extract knowledge pages using candidates and summary
    const ingest = await extractKnowledgePages(raw.buffer, summary, {
      originalName,
      uploadedType,
      rawStorageUrl,
      preExtractedText,
      customization,
      candidates: candidatesResult.rows.map((row) => ({
        slug: row.slug,
        title: row.title,
        overview: row.overview,
        category: row.category,
        tags: row.tags ?? [],
      })),
    })

    const extractedObject = ingest.extractedText
      ? await storageService.upload({
        userId,
        kind: 'extracted_text',
        originalName: `${originalName}.txt`,
        body: ingest.extractedText,
        mimeType: 'text/plain',
      })
      : undefined

    const sourceTitle = summary.title ?? originalName
    const sourceCategory = summary.category ?? 'Uncategorized'
    const sourceTags = uniqueCleanStrings(summary.tags ?? [])
    const summaryMarkdown = summary.body ?? ''
    const summaryObject = summaryMarkdown
      ? await storageService.upload({
        userId,
        kind: 'source_summary',
        originalName: `${sourceTitle}.md`,
        body: summaryMarkdown,
        mimeType: 'text/markdown',
      })
      : undefined
    const sourceExcerpt = summary.excerpt || excerpt(summaryMarkdown || originalName)
    const sourceStatus = ingest.skipped ? 'Queued' : 'Processed'

    await pool.query(
      `UPDATE sources
       SET type=$1,title=$2,content=NULL,tags=$3,category=$4,status=$5,excerpt=$6,
        raw_storage_object_id=$7,extracted_storage_object_id=$8,summary_storage_object_id=$9,knowledge_tags=$10,updated_at=now()
       WHERE id=$11`,
      [
        uploadedType,
        sourceTitle,
        sourceTags,
        sourceCategory,
        sourceStatus,
        sourceExcerpt,
        rawStorageObjectId,
        extractedObject?.id ?? null,
        summaryObject?.id ?? null,
        sourceTags,
        sourceId,
      ],
    )

    const sourceReference = { id: sourceId, type: uploadedType, title: sourceTitle }
    const writtenObjects = [extractedObject?.url, summaryObject?.url].filter(Boolean)
    for (const page of ingest.pages) {
      const action = page.action ?? 'create'
      if (action === 'skip') continue
      const targetSlug = page.targetSlug ? slugify(page.targetSlug) : ''
      const slug = action === 'update' || action === 'merge' || action === 'replace' || action === 'link_only'
        ? targetSlug || slugify(page.filename.replace(/\.md$/i, '') || page.title)
        : slugify(page.filename.replace(/\.md$/i, '') || page.title)
      if (!slug) continue
      if (action === 'link_only') {
        await pool.query(
          `UPDATE knowledge_entries
           SET source_list=(
             SELECT COALESCE(jsonb_agg(source_item), '[]'::jsonb)
             FROM (
               SELECT DISTINCT ON (source_item->>'id') source_item
               FROM jsonb_array_elements(source_list || $1::jsonb) AS source_items(source_item)
               ORDER BY source_item->>'id'
             ) deduped_sources
           ),
           timeline=timeline || $2::jsonb,
           updated=$3,
           updated_at=now()
           WHERE user_id=$4 AND slug=$5`,
          [
            JSON.stringify([sourceReference]),
            JSON.stringify([{ date: created, event: timelineEvent(action, sourceTitle, page.reason) }]),
            created,
            userId,
            slug,
          ],
        )
        await pool.query(
          `INSERT INTO knowledge_source_links (user_id,slug,source_id,relation)
           VALUES ($1,$2,$3,$4)
           ON CONFLICT (user_id, slug, source_id) DO UPDATE SET relation=EXCLUDED.relation`,
          [userId, slug, sourceId, 'supports'],
        )
        continue
      }

      const markdownObject = await storageService.upload({
        userId,
        kind: action === 'create' ? 'knowledge_markdown' : 'knowledge_revision',
        originalName: `${slug}.md`,
        body: page.body,
        mimeType: 'text/markdown',
      })
      writtenObjects.push(markdownObject.url)
      const related = uniqueCleanStrings(page.related).map((item) => ({ slug: slugify(item), title: item })).filter((item) => item.slug)
      const embedding = await embedText(`${page.title}\n${excerpt(page.body, 1000)}\n${sourceTags.join(' ')}`)
      await pool.query(
        `INSERT INTO knowledge_entries
          (slug,user_id,title,content,overview,category,tags,created,updated,read_time,key_ideas,explanation,examples,related,reference_list,source_list,timeline,markdown_storage_object_id,knowledge_tags,search_vector,embedding)
         VALUES ($1,$2,$3,NULL,$4,$5,$6,$7,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,to_tsvector('simple', $18),$19)
         ON CONFLICT (user_id, slug) DO UPDATE SET
          title=EXCLUDED.title,
          content=NULL,
          overview=EXCLUDED.overview,
          category=EXCLUDED.category,
          tags=(SELECT ARRAY(SELECT DISTINCT unnest(knowledge_entries.tags || EXCLUDED.tags))),
          updated=EXCLUDED.updated,
          read_time=EXCLUDED.read_time,
          explanation=EXCLUDED.explanation,
          related=EXCLUDED.related,
          reference_list=EXCLUDED.reference_list,
          source_list=(
            SELECT COALESCE(jsonb_agg(source_item), '[]'::jsonb)
            FROM (
              SELECT DISTINCT ON (source_item->>'id') source_item
              FROM jsonb_array_elements(knowledge_entries.source_list || EXCLUDED.source_list) AS source_items(source_item)
              ORDER BY source_item->>'id'
            ) deduped_sources
          ),
          markdown_storage_object_id=EXCLUDED.markdown_storage_object_id,
          knowledge_tags=(SELECT ARRAY(SELECT DISTINCT unnest(knowledge_entries.knowledge_tags || EXCLUDED.knowledge_tags))),
          search_vector=EXCLUDED.search_vector,
          embedding=EXCLUDED.embedding,
          timeline=knowledge_entries.timeline || EXCLUDED.timeline,
          updated_at=now()`,
        [
          slug,
          userId,
          page.title,
          page.overview || excerpt(page.body, 220),
          sourceCategory,
          sourceTags,
          created,
          readTimeFromContent(page.body),
          JSON.stringify([]),
          JSON.stringify(page.body.split(/\n\s*\n/).filter(Boolean).slice(0, 4)),
          JSON.stringify([]),
          JSON.stringify(related),
          JSON.stringify([{ label: sourceTitle, source: rawStorageUrl }]),
          JSON.stringify([sourceReference]),
          JSON.stringify([{ date: created, event: timelineEvent(action, sourceTitle, page.reason) }]),
          markdownObject.id,
          sourceTags,
          `${page.title}\n${excerpt(page.body, 500)}\n${sourceTags.join(' ')}`,
          JSON.stringify(embedding),
        ],
      )
      await pool.query(
        `INSERT INTO knowledge_revisions (id,user_id,slug,storage_object_id,revision_type,model,reason)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [`revision_${crypto.randomUUID()}`, userId, slug, markdownObject.id, action, customization.ingestModel, page.reason ?? `Ingested from ${sourceTitle}`],
      )
      await pool.query(
        `INSERT INTO knowledge_source_links (user_id,slug,source_id,relation)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (user_id, slug, source_id) DO UPDATE SET relation=EXCLUDED.relation`,
        [userId, slug, sourceId, action === 'merge' ? 'merged_from' : action === 'replace' ? 'replaced_from' : 'supports'],
      )
    }

    await sourcesRepository.updateUploadedFileStatus(fileId, ingest.skipped ? 'skipped' : 'completed', writtenObjects)
    console.log(`[Ingest] Ingest finished for "${originalName}" (${sourceId}). Title: "${sourceTitle}", Excerpt: "${sourceExcerpt}". Ingested ${ingest.pages.length} pages: ${ingest.pages.map(p => `[${p.action || 'create'}] ${p.title}`).join(', ')}`)
  } catch (error) {
    console.error(`[Ingest] Failed for "${originalName}":`, error)
    await sourcesRepository.failUploadedFile(fileId).catch(console.error)
    await pool.query("UPDATE sources SET status='Queued', excerpt=$1 WHERE id=$2", [`Ingestion failed: ${error instanceof Error ? error.message : 'Gemini ingest failed'}`, sourceId]).catch(console.error)
  }
}
