import { excerpt, slugify, uniqueCleanStrings, wordCount } from '../../utils/text.js'
import { sourcesRepository } from './sources.repository.js'
import { pool } from '../../database/pool.js'
import {
  generateIngestSummary,
  extractKnowledgePages,
  extractText,
  type IngestRawFileOptions,
  type KnowledgeProposal,
} from '../../wiki/ingest.js'
import { storageService } from '../../lib/storage.js'
import { embedText } from '../../lib/embeddings.js'
import { defaultAiCustomization, type AiCustomizationProfile } from '../ai-customization/ai-customization.defaults.js'

const INITIAL_CANDIDATE_LIMIT = 15
const MIN_VECTOR_SCORE = 0.70
const MIN_FTS_SCORE = 0.05
const VECTOR_WEIGHT = 0.7
const FTS_WEIGHT = 0.3
const SCORE_MARGIN = 0.08
const MULTI_QUERY_MATCH_BONUS = 0.02
const MAX_MULTI_QUERY_BONUS = 0.06
const MAX_FULL_CANDIDATES = 5
const TOO_MANY_STRONG_CANDIDATES = 6
const MAX_QUERY_REFINEMENTS = 1
const RESERVED_OUTPUT_TOKENS = 6000
const PROMPT_OVERHEAD_TOKENS = 2000
const MAX_CANDIDATE_MARKDOWN_TOKENS = 12000
const MAX_SINGLE_CANDIDATE_TOKENS = 8000
const MODEL_CONTEXT_LIMIT = 100000

function readTimeFromContent(content: string) {
  const minutes = Math.max(1, Math.ceil(wordCount(content) / 220))
  return `${minutes} min read`
}

function tokenEstimate(text: string) {
  return Math.max(1, Math.ceil(text.length / 4))
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

function jsonArray(value: unknown): any[] {
  return Array.isArray(value) ? value : []
}

function uniqueJson(values: any[], key: (value: any) => string): any[] {
  const seen = new Set<string>()
  return values.filter((value) => {
    const id = key(value)
    if (!id || seen.has(id)) return false
    seen.add(id)
    return true
  })
}

type IngestCandidate = NonNullable<IngestRawFileOptions['candidates']>[number] & {
  markdownStorageObjectId?: string
  snippet: string
  matchedQueryCount: number
  ftsScore: number
  vectorScore: number
  score: number
  matchedQueries: string[]
}

function normalizeFtsScore(score: number) {
  if (!Number.isFinite(score) || score <= 0) return 0
  return Math.min(1, score / (score + 0.1))
}

function hybridScore(input: { vectorScore: number; ftsScore: number; matchedQueryCount: number }) {
  const base = VECTOR_WEIGHT * Math.max(0, Math.min(1, input.vectorScore))
    + FTS_WEIGHT * normalizeFtsScore(input.ftsScore)
  const bonus = Math.min(MAX_MULTI_QUERY_BONUS, Math.max(0, input.matchedQueryCount - 1) * MULTI_QUERY_MATCH_BONUS)
  return Math.min(1, base + bonus)
}

function candidatePasses(candidate: Pick<IngestCandidate, 'vectorScore' | 'ftsScore'>) {
  return candidate.vectorScore >= MIN_VECTOR_SCORE || candidate.ftsScore >= MIN_FTS_SCORE
}

function refineProposalQueries(proposal: KnowledgeProposal) {
  const compact = uniqueCleanStrings([
    proposal.title,
    proposal.conceptType,
    ...proposal.retrievalQueries,
  ]).slice(0, 4)
  return [compact.join(' ')]
}

function queryListForProposal(proposal: KnowledgeProposal, refinementCount: number) {
  if (refinementCount > 0) return refineProposalQueries(proposal)
  return uniqueCleanStrings([proposal.title, ...proposal.retrievalQueries]).slice(0, 4)
}

function combineCandidate(existing: IngestCandidate | undefined, next: IngestCandidate): IngestCandidate {
  if (!existing) return next
  const matchedQueries = uniqueCleanStrings([...existing.matchedQueries, ...next.matchedQueries])
  const matchedQueryCount = matchedQueries.length
  const ftsScore = Math.max(existing.ftsScore, next.ftsScore)
  const vectorScore = Math.max(existing.vectorScore, next.vectorScore)
  return {
    ...existing,
    overview: existing.overview || next.overview,
    category: existing.category || next.category,
    tags: uniqueCleanStrings([...(existing.tags ?? []), ...(next.tags ?? [])]),
    snippet: existing.snippet.length >= next.snippet.length ? existing.snippet : next.snippet,
    matchedQueries,
    matchedQueryCount,
    ftsScore,
    vectorScore,
    score: hybridScore({ ftsScore, vectorScore, matchedQueryCount }),
  }
}

async function retrieveCandidateMetadata(userId: string, query: string): Promise<IngestCandidate[]> {
  const trimmedQuery = query.trim()
  if (!trimmedQuery) return []
  const queryEmbedding = await embedText(trimmedQuery).catch(() => [])
  const rows = queryEmbedding.length
    ? (await pool.query(
      `SELECT slug,title,overview,category,knowledge_tags AS tags,markdown_storage_object_id,
        ts_rank_cd(COALESCE(search_vector, to_tsvector('simple', title || ' ' || overview || ' ' || array_to_string(knowledge_tags, ' '))), plainto_tsquery('simple', $2)) AS fts_score,
        1 - (embedding <=> $3::vector) AS vector_score
       FROM knowledge_entries
       WHERE user_id=$1
         AND (
          $2 = ''
          OR COALESCE(search_vector, to_tsvector('simple', title || ' ' || overview || ' ' || array_to_string(knowledge_tags, ' '))) @@ plainto_tsquery('simple', $2)
          OR title ILIKE '%' || $2 || '%'
          OR overview ILIKE '%' || $2 || '%'
          OR embedding <=> $3::vector < 0.35
         )
       ORDER BY
         (0.7 * GREATEST(0, 1 - (embedding <=> $3::vector)))
         + (0.3 * LEAST(1, ts_rank_cd(COALESCE(search_vector, to_tsvector('simple', title || ' ' || overview || ' ' || array_to_string(knowledge_tags, ' '))), plainto_tsquery('simple', $2)) / 0.1))
         DESC,
         updated_at DESC
       LIMIT $4`,
      [userId, trimmedQuery, `[${queryEmbedding.join(',')}]`, INITIAL_CANDIDATE_LIMIT],
    )).rows
    : (await pool.query(
      `SELECT slug,title,overview,category,knowledge_tags AS tags,markdown_storage_object_id,
        ts_rank_cd(COALESCE(search_vector, to_tsvector('simple', title || ' ' || overview || ' ' || array_to_string(knowledge_tags, ' '))), plainto_tsquery('simple', $2)) AS fts_score,
        0 AS vector_score
       FROM knowledge_entries
       WHERE user_id=$1
         AND (
          COALESCE(search_vector, to_tsvector('simple', title || ' ' || overview || ' ' || array_to_string(knowledge_tags, ' '))) @@ plainto_tsquery('simple', $2)
          OR title ILIKE '%' || $2 || '%'
          OR overview ILIKE '%' || $2 || '%'
         )
       ORDER BY
         ts_rank_cd(COALESCE(search_vector, to_tsvector('simple', title || ' ' || overview || ' ' || array_to_string(knowledge_tags, ' '))), plainto_tsquery('simple', $2)) DESC,
         updated_at DESC
       LIMIT $3`,
      [userId, trimmedQuery, INITIAL_CANDIDATE_LIMIT],
    )).rows

  return rows.map((row) => {
    const ftsScore = Number(row.fts_score ?? 0)
    const vectorScore = Number(row.vector_score ?? 0)
    return {
      slug: row.slug,
      title: row.title,
      overview: row.overview,
      category: row.category,
      tags: row.tags ?? [],
      markdownStorageObjectId: row.markdown_storage_object_id ?? undefined,
      content: '',
      snippet: excerpt(`${row.title}\n${row.overview ?? ''}\n${(row.tags ?? []).join(' ')}`, 800),
      matchedQueryCount: 1,
      matchedQueries: [trimmedQuery],
      ftsScore,
      vectorScore,
      score: hybridScore({ ftsScore, vectorScore, matchedQueryCount: 1 }),
    }
  })
}

async function retrieveProposalCandidates(userId: string, proposal: KnowledgeProposal): Promise<{ candidates: IngestCandidate[]; refinementUsed: boolean }> {
  let refinementUsed = false
  let aggregated = new Map<string, IngestCandidate>()

  for (let refinementCount = 0; refinementCount <= MAX_QUERY_REFINEMENTS; refinementCount += 1) {
    aggregated = new Map<string, IngestCandidate>()
    const queries = queryListForProposal(proposal, refinementCount)
    for (const query of queries) {
      const rows = await retrieveCandidateMetadata(userId, query)
      for (const candidate of rows) {
        aggregated.set(candidate.slug, combineCandidate(aggregated.get(candidate.slug), candidate))
      }
    }

    const sorted = Array.from(aggregated.values())
      .filter(candidatePasses)
      .sort((a, b) => b.score - a.score)
    const topScore = sorted[0]?.score ?? 0
    const strong = sorted.filter((candidate) => candidate.score >= topScore - SCORE_MARGIN)
    if (strong.length >= TOO_MANY_STRONG_CANDIDATES && refinementCount < MAX_QUERY_REFINEMENTS) {
      refinementUsed = true
      continue
    }
    return { candidates: strong.slice(0, MAX_FULL_CANDIDATES), refinementUsed }
  }

  return { candidates: [], refinementUsed }
}

function headingOutline(markdown: string) {
  const headings = markdown.match(/^#{1,6}\s+.+$/gm) ?? []
  return headings.slice(0, 40).join('\n')
}

function reduceCandidateMarkdown(candidate: IngestCandidate, content: string, tokenBudget: number) {
  if (tokenEstimate(content) <= tokenBudget) return content
  const outline = headingOutline(content)
  const charBudget = Math.max(1200, tokenBudget * 4)
  const prefix = content.slice(0, Math.floor(charBudget * 0.75)).trim()
  const suffix = content.slice(Math.max(0, content.length - Math.floor(charBudget * 0.15))).trim()
  return [
    `# ${candidate.title}`,
    '',
    candidate.overview,
    '',
    outline ? `## Existing Heading Outline\n${outline}` : '',
    '',
    '## Structurally Reduced Existing Markdown',
    prefix,
    suffix && suffix !== prefix ? `\n[...candidate reduced for context budget...]\n\n${suffix}` : '',
  ].filter(Boolean).join('\n')
}

async function loadCandidateMarkdown(userId: string, candidates: IngestCandidate[], candidateBudget: number): Promise<IngestCandidate[]> {
  const selected: IngestCandidate[] = []
  let usedTokens = 0
  for (const candidate of candidates) {
    if (!candidate.markdownStorageObjectId) {
      selected.push(candidate)
      continue
    }
    const fullContent = await storageService.readText({ userId, storageObjectId: candidate.markdownStorageObjectId })
      .then((result) => result.text)
      .catch(() => '')
    if (!fullContent) {
      selected.push(candidate)
      continue
    }
    const remainingBudget = Math.max(1200, candidateBudget - usedTokens)
    const perCandidateBudget = Math.min(MAX_SINGLE_CANDIDATE_TOKENS, remainingBudget)
    const content = reduceCandidateMarkdown(candidate, fullContent, perCandidateBudget)
    const contentTokens = tokenEstimate(content)
    if (usedTokens && usedTokens + contentTokens > candidateBudget) break
    selected.push({ ...candidate, content })
    usedTokens += contentTokens
  }
  return selected
}

async function prepareIngestContext(input: {
  userId: string
  summary: { ingestBrief?: { knowledgeProposals?: KnowledgeProposal[] }; title?: string; excerpt?: string; tags?: string[] }
  canonicalMarkdown: string
}) {
  const fallbackProposal: KnowledgeProposal = {
    title: input.summary.title || 'Source Knowledge',
    conceptType: 'source',
    retrievalQueries: uniqueCleanStrings([input.summary.title || '', input.summary.excerpt || '', ...(input.summary.tags ?? [])]).slice(0, 3),
    possibleSectionIds: [],
    reason: 'Fallback proposal generated from source summary.',
  }
  const proposals = input.summary.ingestBrief?.knowledgeProposals?.length
    ? input.summary.ingestBrief.knowledgeProposals
    : [fallbackProposal]
  const candidateMap = new Map<string, IngestCandidate>()
  let refinementUsed = false
  let queryCount = 0

  for (const proposal of proposals) {
    queryCount += queryListForProposal(proposal, 0).length
    const result = await retrieveProposalCandidates(input.userId, proposal)
    refinementUsed = refinementUsed || result.refinementUsed
    for (const candidate of result.candidates) {
      candidateMap.set(candidate.slug, combineCandidate(candidateMap.get(candidate.slug), candidate))
    }
  }

  const narrowed = Array.from(candidateMap.values())
    .filter(candidatePasses)
    .sort((a, b) => b.score - a.score)
  const topScore = narrowed[0]?.score ?? 0
  const strong = narrowed.filter((candidate) => candidate.score >= topScore - SCORE_MARGIN).slice(0, MAX_FULL_CANDIDATES)
  const sourceMarkdown = input.canonicalMarkdown
  const sourceTokens = tokenEstimate(sourceMarkdown)
  const dynamicCandidateBudget = Math.max(0, MODEL_CONTEXT_LIMIT - RESERVED_OUTPUT_TOKENS - PROMPT_OVERHEAD_TOKENS - sourceTokens)
  const candidateBudget = Math.min(MAX_CANDIDATE_MARKDOWN_TOKENS, dynamicCandidateBudget)
  const candidates = await loadCandidateMarkdown(input.userId, strong, candidateBudget)
  const candidateTokens = candidates.reduce((sum, candidate) => sum + tokenEstimate(candidate.content || candidate.snippet || ''), 0)

  console.log(`[Ingest] Context prepared: proposals=${proposals.length}, queries=${queryCount}, candidates=${narrowed.length}, strong=${strong.length}, loaded=${candidates.length}, refinement=${refinementUsed ? 'yes' : 'no'}, sourceTokens=${sourceTokens}, candidateTokens=${candidateTokens}, slugs=${candidates.map((candidate) => candidate.slug).join(',')}`)

  return {
    proposals,
    candidates,
    relevantSourceMarkdown: sourceMarkdown,
  }
}

async function collapseMergedKnowledge(input: {
  userId: string
  targetSlug: string
  targetTitle: string
  mergedSlugs: string[]
}) {
  const obsoleteSlugs = input.mergedSlugs.filter((slug) => slug !== input.targetSlug)
  if (!obsoleteSlugs.length) return

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(
      `SELECT slug,tags,knowledge_tags,source_list,reference_list,timeline
       FROM knowledge_entries
       WHERE user_id=$1 AND slug = ANY($2::text[])
       FOR UPDATE`,
      [input.userId, input.mergedSlugs],
    )
    const foundSlugs = new Set(rows.map((row) => row.slug))
    if (!foundSlugs.has(input.targetSlug) || obsoleteSlugs.some((slug) => !foundSlugs.has(slug))) {
      throw new Error('One or more Knowledge pages selected by the ingest merge no longer exist')
    }

    const tags = uniqueCleanStrings(rows.flatMap((row) => row.tags ?? []))
    const knowledgeTags = uniqueCleanStrings(rows.flatMap((row) => row.knowledge_tags ?? []))
    const sources = uniqueJson(rows.flatMap((row) => jsonArray(row.source_list)), (value) => String(value?.id ?? value?.source ?? value?.title ?? ''))
    const references = uniqueJson(rows.flatMap((row) => jsonArray(row.reference_list)), (value) => `${String(value?.label ?? '')}::${String(value?.source ?? value?.id ?? '')}`)
    const timeline = uniqueJson(rows.flatMap((row) => jsonArray(row.timeline)), (value) => `${String(value?.date ?? '')}::${String(value?.event ?? '')}`)

    await client.query(
      `UPDATE knowledge_entries
       SET tags=$1,knowledge_tags=$2,source_list=$3,reference_list=$4,timeline=$5,updated_at=now()
       WHERE user_id=$6 AND slug=$7`,
      [
        tags,
        knowledgeTags,
        JSON.stringify(sources),
        JSON.stringify(references),
        JSON.stringify(timeline),
        input.userId,
        input.targetSlug,
      ],
    )

    await client.query(
      `INSERT INTO knowledge_source_links (user_id,slug,source_id,relation)
       SELECT user_id,$3,source_id,'merged_from'
       FROM knowledge_source_links
       WHERE user_id=$1 AND slug = ANY($2::text[])
       ON CONFLICT (user_id,slug,source_id) DO UPDATE SET relation='merged_from'`,
      [input.userId, input.mergedSlugs, input.targetSlug],
    )
    await client.query(
      'UPDATE knowledge_revisions SET slug=$1 WHERE user_id=$2 AND slug = ANY($3::text[])',
      [input.targetSlug, input.userId, obsoleteSlugs],
    )

    const relatedRows = await client.query(
      'SELECT slug,related FROM knowledge_entries WHERE user_id=$1 AND jsonb_array_length(related) > 0 FOR UPDATE',
      [input.userId],
    )
    for (const row of relatedRows.rows) {
      const nextRelated = uniqueJson(
        jsonArray(row.related)
          .map((related) => obsoleteSlugs.includes(String(related?.slug ?? ''))
            ? { slug: input.targetSlug, title: input.targetTitle }
            : related)
          .filter((related) => String(related?.slug ?? '') !== row.slug)
          .filter((related) => !obsoleteSlugs.includes(String(related?.slug ?? ''))),
        (related) => String(related?.slug ?? ''),
      )
      if (JSON.stringify(nextRelated) !== JSON.stringify(jsonArray(row.related))) {
        await client.query(
          'UPDATE knowledge_entries SET related=$1,updated_at=now() WHERE user_id=$2 AND slug=$3',
          [JSON.stringify(nextRelated), input.userId, row.slug],
        )
      }
    }

    await client.query(
      'DELETE FROM knowledge_source_links WHERE user_id=$1 AND slug = ANY($2::text[])',
      [input.userId, obsoleteSlugs],
    )
    await client.query(
      'DELETE FROM knowledge_entries WHERE user_id=$1 AND slug = ANY($2::text[])',
      [input.userId, obsoleteSlugs],
    )
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
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

    if (!preExtractedText) {
      preExtractedText = await extractText(raw.buffer, originalName)
    }
    const canonicalMarkdown = preExtractedText?.canonicalMarkdown || preExtractedText?.text || ''
    const preparedContext = await prepareIngestContext({
      userId,
      summary,
      canonicalMarkdown,
    })
    
    // 3. Extract final Knowledge actions with the narrowed full context.
    const ingest = await extractKnowledgePages(raw.buffer, summary, {
      originalName,
      uploadedType,
      rawStorageUrl,
      preExtractedText,
      customization,
      candidates: preparedContext.candidates,
      relevantSourceMarkdown: preparedContext.relevantSourceMarkdown,
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
    const sourceStatus = 'Processed'

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
    const candidateSlugs = new Set(preparedContext.candidates.map((candidate) => candidate.slug))
    for (const page of ingest.pages) {
      let action = page.action ?? 'create'
      if (action === 'skip') continue
      const targetSlug = page.targetSlug ? slugify(page.targetSlug) : ''
      if (action !== 'create' && !candidateSlugs.has(targetSlug)) {
        if (action === 'link_only') continue
        action = 'create'
      }
      const requestedMergedSlugs = uniqueCleanStrings((page.mergedSlugs ?? []).map(slugify))
        .filter((slug) => candidateSlugs.has(slug))
      const mergedSlugs = action === 'merge'
        ? uniqueCleanStrings([targetSlug, ...requestedMergedSlugs]).filter((slug) => candidateSlugs.has(slug))
        : []
      if (action === 'merge' && (!targetSlug || mergedSlugs.length < 2)) {
        action = targetSlug && candidateSlugs.has(targetSlug) ? 'update' : 'create'
      }
      let slug = action === 'update' || action === 'merge' || action === 'replace' || action === 'link_only'
        ? targetSlug || slugify(page.filename.replace(/\.md$/i, '') || page.title)
        : slugify(page.filename.replace(/\.md$/i, '') || page.title)
      if (action === 'create' && slug) {
        const baseSlug = slug
        let suffix = 2
        while ((await pool.query('SELECT 1 FROM knowledge_entries WHERE user_id=$1 AND slug=$2', [userId, slug])).rowCount) {
          slug = `${baseSlug}-${suffix}`
          suffix += 1
        }
      }
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
          reference_list=(
            SELECT COALESCE(jsonb_agg(reference_item), '[]'::jsonb)
            FROM (
              SELECT DISTINCT ON (reference_item->>'source', reference_item->>'label') reference_item
              FROM jsonb_array_elements(knowledge_entries.reference_list || EXCLUDED.reference_list) AS reference_items(reference_item)
              ORDER BY reference_item->>'source', reference_item->>'label'
            ) deduped_references
          ),
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
      if (action === 'merge') {
        await collapseMergedKnowledge({
          userId,
          targetSlug: slug,
          targetTitle: page.title,
          mergedSlugs,
        })
      }
    }

    await sourcesRepository.updateUploadedFileStatus(fileId, ingest.skipped ? 'skipped' : 'completed', writtenObjects)
    console.log(`[Ingest] Ingest finished for "${originalName}" (${sourceId}). Title: "${sourceTitle}", Excerpt: "${sourceExcerpt}". Ingested ${ingest.pages.length} pages: ${ingest.pages.map(p => `[${p.action || 'create'}] ${p.title}`).join(', ')}`)
  } catch (error) {
    console.error(`[Ingest] Failed for "${originalName}":`, error)
    await sourcesRepository.failUploadedFile(fileId).catch(console.error)
    await pool.query("UPDATE sources SET status='Queued', excerpt=$1 WHERE id=$2", [`Ingestion failed: ${error instanceof Error ? error.message : 'Gemini ingest failed'}`, sourceId]).catch(console.error)
  }
}
