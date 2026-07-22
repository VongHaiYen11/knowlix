import { excerpt, slugify, uniqueCleanStrings, wordCount } from '../../../utils/text.js'
import { sourcesRepository } from '../sources.repository.js'
import { sourceIngestionRepository, type SourceIngestionRepository } from '../source-ingestion.repository.js'
import {
  generateIngestSummary,
  extractKnowledgePages,
  extractText,
  type IngestRawFileOptions,
  type KnowledgeProposal,
} from '../../../wiki/ingest.js'
import { storageService } from '../../../lib/storage.js'
import { embedText } from '../../../lib/embeddings.js'
import { nowIsoTimestamp } from '../../../utils/date.js'
import { defaultAiCustomization, type AiCustomizationProfile } from '../../ai-customization/ai-customization.defaults.js'

export type GenerateSourceSummaryDependencies = {
  ingestionRepository: SourceIngestionRepository
  sourceRepository: Pick<typeof sourcesRepository, 'updateUploadedFileStatus' | 'failUploadedFile'>
  storage: Pick<typeof storageService, 'download' | 'readText' | 'upload'>
  embed: typeof embedText
  extractSourceText: typeof extractText
  generateSummary: typeof generateIngestSummary
  extractPages: typeof extractKnowledgePages
}

export type GenerateSourceSummaryResult = {
  status: 'completed' | 'skipped' | 'failed'
  message?: string
}

const defaultDependencies: GenerateSourceSummaryDependencies = {
  ingestionRepository: sourceIngestionRepository,
  sourceRepository: sourcesRepository,
  storage: storageService,
  embed: embedText,
  extractSourceText: extractText,
  generateSummary: generateIngestSummary,
  extractPages: extractKnowledgePages,
}

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

async function retrieveCandidateMetadata(
  userId: string,
  query: string,
  dependencies: Pick<GenerateSourceSummaryDependencies, 'embed' | 'ingestionRepository'>,
): Promise<IngestCandidate[]> {
  const trimmedQuery = query.trim()
  if (!trimmedQuery) return []
  const queryEmbedding = await dependencies.embed(trimmedQuery).catch(() => [])
  const rows = await dependencies.ingestionRepository.findKnowledgeCandidates(
    userId,
    trimmedQuery,
    queryEmbedding,
    INITIAL_CANDIDATE_LIMIT,
  )

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

async function retrieveProposalCandidates(
  userId: string,
  proposal: KnowledgeProposal,
  dependencies: Pick<GenerateSourceSummaryDependencies, 'embed' | 'ingestionRepository'>,
): Promise<{ candidates: IngestCandidate[]; refinementUsed: boolean }> {
  let refinementUsed = false
  let aggregated = new Map<string, IngestCandidate>()

  for (let refinementCount = 0; refinementCount <= MAX_QUERY_REFINEMENTS; refinementCount += 1) {
    aggregated = new Map<string, IngestCandidate>()
    const queries = queryListForProposal(proposal, refinementCount)
    for (const query of queries) {
      const rows = await retrieveCandidateMetadata(userId, query, dependencies)
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

async function loadCandidateMarkdown(
  userId: string,
  candidates: IngestCandidate[],
  candidateBudget: number,
  storage: Pick<typeof storageService, 'readText'>,
): Promise<IngestCandidate[]> {
  const selected: IngestCandidate[] = []
  let usedTokens = 0
  for (const candidate of candidates) {
    if (!candidate.markdownStorageObjectId) {
      selected.push(candidate)
      continue
    }
    const fullContent = await storage.readText({ userId, storageObjectId: candidate.markdownStorageObjectId })
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
}, dependencies: Pick<GenerateSourceSummaryDependencies, 'embed' | 'ingestionRepository' | 'storage'>) {
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
    const result = await retrieveProposalCandidates(input.userId, proposal, dependencies)
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
  const candidates = await loadCandidateMarkdown(input.userId, strong, candidateBudget, dependencies.storage)
  const candidateTokens = candidates.reduce((sum, candidate) => sum + tokenEstimate(candidate.content || candidate.snippet || ''), 0)

  console.log(`[Ingest] Context prepared: proposals=${proposals.length}, queries=${queryCount}, candidates=${narrowed.length}, strong=${strong.length}, loaded=${candidates.length}, refinement=${refinementUsed ? 'yes' : 'no'}, sourceTokens=${sourceTokens}, candidateTokens=${candidateTokens}, slugs=${candidates.map((candidate) => candidate.slug).join(',')}`)

  return {
    proposals,
    candidates,
    relevantSourceMarkdown: sourceMarkdown,
  }
}

export class GenerateSourceSummaryUseCase {
  constructor(private readonly dependencies: GenerateSourceSummaryDependencies = defaultDependencies) {}

  async execute(input: {
    userId: string
    fileId: string
    sourceId: string
    rawStorageObjectId: string
    rawStorageUrl: string
    originalName: string
    created: string
    uploadedType: string
    customization?: AiCustomizationProfile
  }): Promise<GenerateSourceSummaryResult> {
    const { userId, fileId, sourceId, rawStorageObjectId, rawStorageUrl, originalName, created, uploadedType } = input
    const customization = input.customization ?? defaultAiCustomization()
    const dependencies = this.dependencies
    try {
      console.log(`[Ingest] Starting ingest for "${originalName}" (${sourceId})`)
      const raw = await dependencies.storage.download({ userId, storageObjectId: rawStorageObjectId })
      
      // 1. Extract text first
      let preExtractedText
      try {
        preExtractedText = await dependencies.extractSourceText(raw.buffer, originalName)
      } catch (e) {
        console.warn(`[Ingest] Could not pre-extract text:`, e)
      }
      
      // 2. Generate summary from extracted text
      const summary = await dependencies.generateSummary(raw.buffer, {
        originalName,
        uploadedType,
        preExtractedText,
        customization,
      })

      if (!preExtractedText) {
        preExtractedText = await dependencies.extractSourceText(raw.buffer, originalName)
      }
      const canonicalMarkdown = preExtractedText?.canonicalMarkdown || preExtractedText?.text || ''
      const preparedContext = await prepareIngestContext({
        userId,
        summary,
        canonicalMarkdown,
      }, dependencies)
      
      // 3. Extract final Knowledge actions with the narrowed full context.
      const ingest = await dependencies.extractPages(raw.buffer, summary, {
        originalName,
        uploadedType,
        rawStorageUrl,
        preExtractedText,
        customization,
        candidates: preparedContext.candidates,
        relevantSourceMarkdown: preparedContext.relevantSourceMarkdown,
      })

      const extractedObject = ingest.extractedText
        ? await dependencies.storage.upload({
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
        ? await dependencies.storage.upload({
          userId,
          kind: 'source_summary',
          originalName: `${sourceTitle}.md`,
          body: summaryMarkdown,
          mimeType: 'text/markdown',
        })
        : undefined
      const sourceExcerpt = summary.excerpt || excerpt(summaryMarkdown || originalName)
      const sourceStatus = 'Processed'

      await dependencies.ingestionRepository.markSourceProcessed({
        sourceId,
        type: uploadedType,
        title: sourceTitle,
        tags: sourceTags,
        category: sourceCategory,
        status: sourceStatus,
        excerpt: sourceExcerpt,
        rawStorageObjectId,
        extractedStorageObjectId: extractedObject?.id ?? null,
        summaryStorageObjectId: summaryObject?.id ?? null,
      })

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
          while (await dependencies.ingestionRepository.knowledgeSlugExists(userId, slug)) {
            slug = `${baseSlug}-${suffix}`
            suffix += 1
          }
        }
        if (!slug) continue
        if (action === 'link_only') {
          await dependencies.ingestionRepository.linkSource({
            userId,
            slug,
            sourceId,
            sourceReference,
            timelineItem: { date: created, occurredAt: nowIsoTimestamp(), event: timelineEvent(action, sourceTitle, page.reason) },
            updated: created,
            relation: 'supports',
          })
          continue
        }

        const markdownObject = await dependencies.storage.upload({
          userId,
          kind: action === 'create' ? 'knowledge_markdown' : 'knowledge_revision',
          originalName: `${slug}.md`,
          body: page.body,
          mimeType: 'text/markdown',
        })
        writtenObjects.push(markdownObject.url)
        const related = uniqueCleanStrings(page.related).map((item) => ({ slug: slugify(item), title: item })).filter((item) => item.slug)
        const embedding = await dependencies.embed(`${page.title}\n${excerpt(page.body, 6000)}\n${sourceTags.join(' ')}`)
        await dependencies.ingestionRepository.upsertKnowledge({
          slug,
          userId,
          title: page.title,
          overview: page.overview || excerpt(page.body, 220),
          category: sourceCategory,
          tags: sourceTags,
          date: created,
          readTime: readTimeFromContent(page.body),
          explanation: page.body.split(/\n\s*\n/).filter(Boolean).slice(0, 4),
          related,
          references: [{ label: sourceTitle, source: rawStorageUrl }],
          sources: [sourceReference],
          timeline: [{ date: created, occurredAt: nowIsoTimestamp(), event: timelineEvent(action, sourceTitle, page.reason) }],
          markdownStorageObjectId: markdownObject.id,
          searchText: `${page.title}\n${page.overview}\n${page.body}\n${sourceTags.join(' ')}`,
          embedding,
        })
        await dependencies.ingestionRepository.createRevision({
          id: `revision_${crypto.randomUUID()}`,
          userId,
          slug,
          storageObjectId: markdownObject.id,
          revisionType: action,
          model: customization.ingestModel,
          reason: page.reason ?? `Ingested from ${sourceTitle}`,
        })
        await dependencies.ingestionRepository.linkKnowledgeSource({
          userId,
          slug,
          sourceId,
          relation: action === 'merge' ? 'merged_from' : action === 'replace' ? 'replaced_from' : 'supports',
        })
        if (action === 'merge') {
          await dependencies.ingestionRepository.collapseMergedKnowledge({
            userId,
            targetSlug: slug,
            targetTitle: page.title,
            mergedSlugs,
          })
        }
      }

      await dependencies.sourceRepository.updateUploadedFileStatus(fileId, ingest.skipped ? 'skipped' : 'completed', writtenObjects)
      console.log(`[Ingest] Ingest finished for "${originalName}" (${sourceId}). Title: "${sourceTitle}", Excerpt: "${sourceExcerpt}". Ingested ${ingest.pages.length} pages: ${ingest.pages.map(p => `[${p.action || 'create'}] ${p.title}`).join(', ')}`)
      return { status: ingest.skipped ? 'skipped' : 'completed' }
    } catch (error) {
      console.error(`[Ingest] Failed for "${originalName}":`, error)
      await dependencies.sourceRepository.failUploadedFile(fileId).catch(console.error)
      const message = `Ingestion failed: ${error instanceof Error ? error.message : 'Gemini ingest failed'}`
      await dependencies.ingestionRepository.markSourceFailed(sourceId, message).catch(console.error)
      return { status: 'failed', message }
    }
  }
}
