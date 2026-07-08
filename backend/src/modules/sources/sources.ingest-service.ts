import { excerpt, slugify, uniqueCleanStrings, wordCount } from '../../utils/text.js'
import { graphRepository } from '../graph/graph.repository.js'
import { sourcesRepository } from './sources.repository.js'
import { pool } from '../../database/pool.js'
import { ingestRawFile } from '../../wiki/ingest.js'
import type { IngestResult } from '../../wiki/ingest.js'

function readTimeFromContent(content: string) {
  const minutes = Math.max(1, Math.ceil(wordCount(content) / 220))
  return `${minutes} min read`
}

export async function runBackgroundIngest(input: {
  userId: string
  fileId: string
  sourceId: string
  rawFilePath: string
  originalName: string
  created: string
  uploadedType: string
}) {
  const { userId, fileId, sourceId, rawFilePath, originalName, created, uploadedType } = input
  try {
    console.log(`[Ingest] Starting ingest for "${originalName}" (${sourceId})`)
    const ingest = await ingestRawFile(rawFilePath, { originalName, uploadedType })

    await sourcesRepository.updateUploadedFileStatus(fileId, ingest.skipped ? 'skipped' : 'completed', ingest.written)

    const summary = ingest.summary
    const sourceTitle = summary?.title ?? originalName
    const sourceCategory = summary?.category ?? 'Uncategorized'
    const sourceTags = uniqueCleanStrings(summary?.tags ?? [])
    const sourceContent = summary?.body
    const sourceExcerpt = summary?.excerpt || excerpt(sourceContent ?? originalName)
    const sourceStatus = ingest.skipped ? 'Queued' : 'Processed'

    await pool.query(
      `UPDATE sources
       SET type=$1,title=$2,content=$3,tags=$4,category=$5,status=$6,excerpt=$7,updated_at=now()
       WHERE id=$8`,
      [uploadedType, originalName, sourceContent, sourceTags, sourceCategory, sourceStatus, sourceExcerpt, sourceId],
    )

    const sourceReference = { id: sourceId, type: uploadedType, title: originalName }
    for (const page of ingest.pages) {
      const slug = slugify(page.filename.replace(/\.md$/i, '') || page.title)
      if (!slug) continue
      const related = uniqueCleanStrings(page.related).map((item) => ({ slug: slugify(item), title: item })).filter((item) => item.slug)
      await pool.query(
        `INSERT INTO knowledge_entries
          (slug,user_id,title,content,overview,category,tags,created,updated,read_time,key_ideas,explanation,examples,related,reference_list,source_list,timeline)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         ON CONFLICT (user_id, slug) DO UPDATE SET
          title=EXCLUDED.title,
          content=EXCLUDED.content,
          overview=EXCLUDED.overview,
          category=EXCLUDED.category,
          tags=(SELECT ARRAY(SELECT DISTINCT unnest(knowledge_entries.tags || EXCLUDED.tags))),
          updated=EXCLUDED.updated,
          read_time=EXCLUDED.read_time,
          explanation=EXCLUDED.explanation,
          related=EXCLUDED.related,
          reference_list=EXCLUDED.reference_list,
          source_list=EXCLUDED.source_list,
          timeline=knowledge_entries.timeline || EXCLUDED.timeline,
          updated_at=now()`,
        [
          slug,
          userId,
          page.title,
          page.body,
          excerpt(page.body, 220),
          sourceCategory,
          sourceTags,
          created,
          readTimeFromContent(page.body),
          JSON.stringify([]),
          JSON.stringify(page.body.split(/\n\s*\n/).filter(Boolean).slice(0, 4)),
          JSON.stringify([]),
          JSON.stringify(related),
          JSON.stringify([{ label: sourceTitle, source: ingest.sourcePath }]),
          JSON.stringify([sourceReference]),
          JSON.stringify([{ date: created, event: `Generated from ${sourceTitle}` }]),
        ],
      )
      await graphRepository.upsertNode({ userId, slug, label: page.title, category: sourceCategory, tags: sourceTags })
    }

    for (const page of ingest.pages) {
      const slug = slugify(page.filename.replace(/\.md$/i, '') || page.title)
      for (const related of page.related) {
        const target = slugify(related)
        if (!slug || !target || slug === target) continue
        await graphRepository.upsertNode({ userId, slug: target, label: related, category: sourceCategory, tags: sourceTags })
        await graphRepository.link(userId, slug, target)
      }
    }

    for (const link of ingest.graphLinks) {
      const source = slugify(link.source)
      const target = slugify(link.target)
      if (!source || !target || source === target) continue
      await graphRepository.upsertNode({ userId, slug: source, label: link.source, category: sourceCategory, tags: sourceTags })
      await graphRepository.upsertNode({ userId, slug: target, label: link.target, category: sourceCategory, tags: sourceTags })
      await graphRepository.link(userId, source, target)
    }
  } catch (error) {
    console.error(`[Ingest] Failed for "${originalName}":`, error)
    await sourcesRepository.failUploadedFile(fileId).catch(console.error)
    await pool.query("UPDATE sources SET status='Queued', excerpt=$1 WHERE id=$2", [`Ingestion failed: ${error instanceof Error ? error.message : 'Gemini ingest failed'}`, sourceId]).catch(console.error)
  }
}
