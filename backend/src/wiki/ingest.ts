import path from 'node:path'
import mammoth from 'mammoth'
import pdf from 'pdf-parse/lib/pdf-parse.js'
import { getGeminiClient } from '../config/gemini.js'
import { excerpt } from '../utils/text.js'
import { getIngestSummaryPrompt, getIngestPagesPrompt } from '../prompts/index.js'
import { defaultAiCustomization, geminiConfig, type AiCustomizationProfile } from '../modules/ai-customization/ai-customization.defaults.js'

export type IngestAction = 'create' | 'update' | 'merge' | 'replace' | 'link_only' | 'skip'

export interface IngestPage {
  filename: string
  title: string
  overview: string
  body: string
  related: string[]
  action?: IngestAction
  targetSlug?: string
  mergedSlugs?: string[]
  reason?: string
}

export interface IngestSummary {
  title: string
  category: string
  tags: string[]
  body: string
  excerpt: string
  ingestBrief: IngestBrief
}

export interface IngestResult {
  sourcePath: string
  written: string[]
  pages: IngestPage[]
  skipped?: string
  extractedText?: string
  fileKind?: string
  summary?: IngestSummary
}

const supportedExtensions = new Set(['.pdf', '.docx', '.txt', '.md', '.markdown'])
const SOURCE_WINDOW_TOKEN_LIMIT = 12000
const SECTION_TARGET_TOKENS = 900
const SECTION_OVERLAP_PARAGRAPHS = 1

export interface SourceSection {
  id: string
  headingPath: string[]
  content: string
  tokenCount: number
  startOffset: number
  endOffset: number
  parentId?: string
}

export interface KnowledgeProposal {
  title: string
  conceptType: string
  retrievalQueries: string[]
  possibleSectionIds: string[]
  reason: string
}

export interface IngestBrief {
  durableConcepts: string[]
  knowledgeProposals: KnowledgeProposal[]
}

export interface IngestRawFileOptions {
  originalName?: string
  uploadedType?: string
  rawStorageUrl?: string
  customization?: AiCustomizationProfile
  candidates?: Array<{
    slug: string
    title: string
    overview: string
    category: string
    tags: string[]
    content: string
    snippet?: string
    score?: number
    matchedQueryCount?: number
    ftsScore?: number
    vectorScore?: number
  }>
  relevantSourceMarkdown?: string
  sourceSections?: SourceSection[]
  proposal?: KnowledgeProposal
}

export interface ExtractedText {
  fileKind: string
  text: string
  canonicalMarkdown: string
  sections: SourceSection[]
}

function titleFromName(fileName: string, extension: string) {
  return path.basename(fileName, extension)
}

function cleanJsonText(text: string) {
  return text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean)
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function tokenEstimate(text: string) {
  return Math.max(1, Math.ceil(text.length / 4))
}

function normalizeWhitespace(value: string) {
  return value.replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{4,}/g, '\n\n\n').trim()
}

function sourceWindow(markdown: string, tokenLimit = SOURCE_WINDOW_TOKEN_LIMIT) {
  if (tokenEstimate(markdown) <= tokenLimit) return markdown
  const charLimit = tokenLimit * 4
  const head = markdown.slice(0, Math.ceil(charLimit * 0.72)).trim()
  const tail = markdown.slice(Math.max(0, markdown.length - Math.floor(charLimit * 0.18))).trim()
  return `${head}\n\n[...source truncated for summary planning...]\n\n${tail}`.trim()
}

function outlineFromSections(sections: SourceSection[]) {
  return sections.map((section) => ({
    sectionId: section.id,
    headingPath: section.headingPath,
    tokenCount: section.tokenCount,
    preview: excerpt(section.content.replace(/^#+\s+/gm, ''), 220),
  }))
}

function splitParagraphWindows(markdown: string): SourceSection[] {
  const paragraphs = markdown.split(/\n\s*\n/).map((item) => item.trim()).filter(Boolean)
  const sections: SourceSection[] = []
  let current: string[] = []
  let currentTokens = 0
  let cursor = 0
  let sectionIndex = 1

  const flush = () => {
    if (!current.length) return
    const content = current.join('\n\n').trim()
    const startOffset = markdown.indexOf(current[0], Math.max(0, cursor))
    const endOffset = startOffset >= 0 ? startOffset + content.length : cursor + content.length
    sections.push({
      id: `section-${sectionIndex}`,
      headingPath: [`Section ${sectionIndex}`],
      content,
      tokenCount: tokenEstimate(content),
      startOffset: Math.max(0, startOffset),
      endOffset,
    })
    sectionIndex += 1
    cursor = endOffset
    current = current.slice(Math.max(0, current.length - SECTION_OVERLAP_PARAGRAPHS))
    currentTokens = tokenEstimate(current.join('\n\n'))
  }

  for (const paragraph of paragraphs) {
    const paragraphTokens = tokenEstimate(paragraph)
    if (current.length && currentTokens + paragraphTokens > SECTION_TARGET_TOKENS) {
      flush()
    }
    current.push(paragraph)
    currentTokens += paragraphTokens
  }
  flush()
  return sections
}

function splitHeadingSections(markdown: string): SourceSection[] {
  const headingMatches = [...markdown.matchAll(/^#{1,6}\s+.+$/gm)]
  if (!headingMatches.length) return []

  const sections: SourceSection[] = []
  const headingStack: Array<{ level: number; title: string; id: string }> = []
  for (let index = 0; index < headingMatches.length; index += 1) {
    const match = headingMatches[index]
    const heading = match[0]
    const startOffset = match.index ?? 0
    const endOffset = index + 1 < headingMatches.length ? headingMatches[index + 1].index ?? markdown.length : markdown.length
    const level = heading.match(/^#+/)?.[0].length ?? 1
    const title = heading.replace(/^#{1,6}\s+/, '').trim()
    while (headingStack.length && headingStack[headingStack.length - 1].level >= level) headingStack.pop()
    const parentId = headingStack[headingStack.length - 1]?.id
    const id = `section-${index + 1}`
    headingStack.push({ level, title, id })
    const content = markdown.slice(startOffset, endOffset).trim()
    sections.push({
      id,
      headingPath: headingStack.map((item) => item.title),
      content,
      tokenCount: tokenEstimate(content),
      startOffset,
      endOffset,
      parentId,
    })
  }
  return sections
}

function buildCanonicalMarkdown(text: string) {
  return normalizeWhitespace(text)
}

function buildSections(markdown: string) {
  const headingSections = splitHeadingSections(markdown)
  return headingSections.length ? headingSections : splitParagraphWindows(markdown)
}

function cleanLeadingSectionNumber(value: string): string {
  return value.replace(/^\s*\d+(?:\.\d+)*[.)]\s+/, '').trim()
}

function normalizeMarkdownTitle(body: string, title: string): string {
  const cleanTitle = cleanLeadingSectionNumber(title) || title
  const cleanBody = body.trim()
  if (!cleanBody) return cleanBody
  if (/^#\s+.+/m.test(cleanBody)) {
    return cleanBody.replace(/^#\s+.+/m, `# ${cleanTitle}`)
  }
  return `# ${cleanTitle}\n\n${cleanBody}`
}

function normalizeSummaryBody(body: string, title: string): string {
  const cleanBody = body.trim()
  if (!cleanBody) return cleanBody
  const leadingTitle = cleanBody.match(/^#\s+(.+?)(?:\n+|$)/)
  if (!leadingTitle) return cleanBody
  const heading = cleanLeadingSectionNumber(leadingTitle[1]).toLowerCase()
  const cleanTitle = cleanLeadingSectionNumber(title).toLowerCase()
  if (heading && cleanTitle && heading === cleanTitle) {
    return cleanBody.slice(leadingTitle[0].length).trim()
  }
  return cleanBody.replace(/^#\s+/, '## ')
}

function normalizeAction(value: unknown): IngestAction {
  return value === 'update' || value === 'merge' || value === 'replace' || value === 'link_only' || value === 'skip' ? value : 'create'
}

function normalizeProposal(value: unknown): KnowledgeProposal | null {
  const proposal = asRecord(value)
  const title = typeof proposal.title === 'string' ? proposal.title.trim() : ''
  const retrievalQueries = uniqueStrings(asStringArray(proposal.retrievalQueries))
  if (!title && !retrievalQueries.length) return null
  return {
    title: title || retrievalQueries[0] || 'Untitled Knowledge proposal',
    conceptType: typeof proposal.conceptType === 'string' && proposal.conceptType.trim() ? proposal.conceptType.trim() : 'concept',
    retrievalQueries: retrievalQueries.length ? retrievalQueries : [title].filter(Boolean),
    possibleSectionIds: uniqueStrings(asStringArray(proposal.possibleSectionIds)),
    reason: typeof proposal.reason === 'string' ? proposal.reason.trim() : '',
  }
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)))
}

function normalizeIngestBrief(value: unknown, fallback: { title: string; excerpt: string; tags: string[] }): IngestBrief {
  const brief = asRecord(value)
  const durableConcepts = uniqueStrings(asStringArray(brief.durableConcepts))
  const proposals = Array.isArray(brief.knowledgeProposals)
    ? brief.knowledgeProposals.map(normalizeProposal).filter((item): item is KnowledgeProposal => Boolean(item))
    : []
  const fallbackQueries = uniqueStrings([fallback.title, fallback.excerpt, ...fallback.tags].filter(Boolean))

  return {
    durableConcepts: durableConcepts.length ? durableConcepts : uniqueStrings([fallback.title, ...fallback.tags].filter(Boolean)),
    knowledgeProposals: proposals.length
      ? proposals
      : [{
        title: fallback.title,
        conceptType: 'source',
        retrievalQueries: fallbackQueries.length ? fallbackQueries.slice(0, 3) : [fallback.title],
        possibleSectionIds: [],
        reason: 'Fallback proposal generated from the source summary.',
      }],
  }
}

function normalizePage(value: unknown, fallbackTitle: string): IngestPage | null {
  const page = asRecord(value)
  const rawTitle = typeof page.title === 'string' && page.title.trim() ? page.title.trim() : fallbackTitle
  const title = cleanLeadingSectionNumber(rawTitle) || rawTitle
  const overview = typeof page.overview === 'string' && page.overview.trim() ? page.overview.trim() : ''
  const body = typeof page.body === 'string' ? normalizeMarkdownTitle(page.body, title) : ''
  const action = normalizeAction(page.action)
  if (!body && !['link_only', 'skip'].includes(action)) return null
  const filename = typeof page.filename === 'string' && page.filename.trim() ? page.filename.trim() : `${title}.md`
  return {
    filename,
    title,
    overview,
    body,
    related: asStringArray(page.related),
    action,
    targetSlug: typeof page.targetSlug === 'string' ? page.targetSlug.trim() : undefined,
    mergedSlugs: asStringArray(page.mergedSlugs),
    reason: typeof page.reason === 'string' ? page.reason.trim() : undefined,
  }
}

export function normalizeIngestSummary(input: unknown, fallback: { title: string; extractedText: string }): IngestSummary {
  const parsed = asRecord(input)
  const summaryRecord = asRecord(parsed.summary)
  const rawSummaryBody = typeof summaryRecord.body === 'string' && summaryRecord.body.trim() ? summaryRecord.body.trim() : fallback.extractedText
  
  const parsedTitle = cleanLeadingSectionNumber(
    (typeof summaryRecord.title === 'string' ? summaryRecord.title.trim() : '')
    || rawSummaryBody.match(/^#\s+(.+)/m)?.[1]?.trim()
    || '',
  )
  const summaryTitle = parsedTitle || cleanLeadingSectionNumber(fallback.title) || fallback.title
  const summaryBody = normalizeSummaryBody(rawSummaryBody, summaryTitle)
  const parsedExcerpt = typeof summaryRecord.excerpt === 'string' && summaryRecord.excerpt.trim() ? summaryRecord.excerpt.trim() : ''
  const cleanExcerpt = summaryBody.replace(/```[\s\S]*?```/g, '').replace(/[#*_>`|[\]-]/g, '').trim().slice(0, 180)

  return {
    title: summaryTitle,
    category: typeof summaryRecord.category === 'string' && summaryRecord.category.trim() ? summaryRecord.category.trim() : 'Uncategorized',
    tags: asStringArray(summaryRecord.tags),
    body: summaryBody,
    excerpt: parsedExcerpt || cleanExcerpt || excerpt(summaryBody),
    ingestBrief: normalizeIngestBrief(parsed.ingestBrief, {
      title: summaryTitle,
      excerpt: parsedExcerpt || cleanExcerpt || excerpt(summaryBody),
      tags: asStringArray(summaryRecord.tags),
    }),
  }
}

export function normalizeIngestPages(input: unknown, summary: IngestSummary): IngestPage[] {
  const parsed = asRecord(input)
  const pages = Array.isArray(parsed.pages)
    ? parsed.pages.map((page) => normalizePage(page, summary.title)).filter((page): page is IngestPage => Boolean(page))
    : []

  if (pages.length === 0) {
    pages.push({
      filename: '',
      title: '',
      overview: '',
      body: '',
      related: [],
      action: 'skip',
      reason: 'The model returned no durable Knowledge pages.',
    })
  }

  return pages
}

export async function extractText(buffer: Buffer, originalName: string): Promise<ExtractedText> {
  const extension = path.extname(originalName).toLowerCase()
  if (!supportedExtensions.has(extension)) {
    throw new Error(`Unsupported file extension: ${extension || 'none'}`)
  }
  if (extension === '.txt' || extension === '.md' || extension === '.markdown') {
    const text = buffer.toString('utf8')
    const canonicalMarkdown = buildCanonicalMarkdown(text)
    return { fileKind: extension === '.txt' ? 'Plain text' : 'Markdown', text, canonicalMarkdown, sections: buildSections(canonicalMarkdown) }
  }
  if (extension === '.pdf') {
    const data = await pdf(buffer)
    const canonicalMarkdown = buildCanonicalMarkdown(data.text)
    return { fileKind: 'PDF', text: data.text, canonicalMarkdown, sections: buildSections(canonicalMarkdown) }
  }
  const result = await mammoth.extractRawText({ buffer })
  const canonicalMarkdown = buildCanonicalMarkdown(result.value)
  return { fileKind: 'DOCX', text: result.value, canonicalMarkdown, sections: buildSections(canonicalMarkdown) }
}

export async function generateIngestSummary(buffer: Buffer, options: IngestRawFileOptions & { preExtractedText?: ExtractedText } = {}): Promise<IngestSummary> {
  const originalName = options.originalName ?? 'upload'
  const extension = path.extname(originalName).toLowerCase()
  if (!supportedExtensions.has(extension)) {
    throw new Error(`Unsupported file extension: ${extension || 'none'}`)
  }

  const extracted = options.preExtractedText ?? await extractText(buffer, originalName)
  const extractedText = extracted.text.trim()
  if (!extractedText) {
    throw new Error(`No readable text found in ${originalName}`)
  }

  const title = titleFromName(originalName, extension)
  const customization = options.customization ?? defaultAiCustomization()
  const prompt = getIngestSummaryPrompt({
    originalName,
    uploadedType: options.uploadedType ?? 'File',
    fileKind: extracted.fileKind,
    sourceWindow: sourceWindow(extracted.canonicalMarkdown || extractedText),
    sectionOutline: outlineFromSections(extracted.sections),
    knowledgeDefinition: customization.knowledgeDefinition,
    knowledgeExtractionInstructions: customization.knowledgeExtractionInstructions,
  })

  const response = await getGeminiClient().models.generateContent({
    model: customization.ingestModel,
    contents: prompt.contents,
    config: geminiConfig({ responseMimeType: 'application/json', reasoning: customization.ingestReasoning, temperature: customization.ingestTemperature, systemInstruction: prompt.systemInstruction }),
  })
  const responseText = response.text ? cleanJsonText(response.text) : ''
  if (!responseText) throw new Error('Gemini returned an empty ingest summary response')

  try {
    return normalizeIngestSummary(JSON.parse(responseText), { title, extractedText })
  } catch (error) {
    throw new Error(`Failed to parse Gemini ingest summary JSON: ${error instanceof Error ? error.message : 'invalid JSON'}`)
  }
}

export async function extractKnowledgePages(
  buffer: Buffer, 
  summary: IngestSummary,
  options: IngestRawFileOptions & { preExtractedText?: ExtractedText } = {}
): Promise<IngestResult> {
  const originalName = options.originalName ?? 'upload'
  const extension = path.extname(originalName).toLowerCase()
  if (!supportedExtensions.has(extension)) {
    return { sourcePath: options.rawStorageUrl ?? '', written: [], pages: [], skipped: `Unsupported file extension: ${extension || 'none'}` }
  }

  const extracted = options.preExtractedText ?? await extractText(buffer, originalName)
  const extractedText = extracted.text.trim()
  const canonicalMarkdown = (extracted.canonicalMarkdown || extractedText).trim()
  if (!canonicalMarkdown) {
    throw new Error(`No readable text found in ${originalName}`)
  }

  const candidates = (options.candidates ?? []).map((candidate) => ({
    slug: candidate.slug,
    title: candidate.title,
    overview: candidate.overview,
    category: candidate.category,
    tags: candidate.tags,
    snippet: candidate.snippet ?? excerpt(candidate.content, 800),
    score: candidate.score,
    matchedQueryCount: candidate.matchedQueryCount,
    ftsScore: candidate.ftsScore,
    vectorScore: candidate.vectorScore,
    content: candidate.content,
  }))
  const customization = options.customization ?? defaultAiCustomization()
  
  const prompt = getIngestPagesPrompt({
    originalName,
    uploadedType: options.uploadedType ?? 'File',
    fileKind: extracted.fileKind,
    candidates,
    relevantSourceMarkdown: options.relevantSourceMarkdown ?? canonicalMarkdown,
    sourceSummary: summary,
    ingestBrief: summary.ingestBrief,
    proposal: options.proposal,
    knowledgeDefinition: customization.knowledgeDefinition,
    knowledgeExtractionInstructions: customization.knowledgeExtractionInstructions,
  })

  const response = await getGeminiClient().models.generateContent({
    model: customization.ingestModel,
    contents: prompt.contents,
    config: geminiConfig({ responseMimeType: 'application/json', reasoning: customization.ingestReasoning, temperature: customization.ingestTemperature, systemInstruction: prompt.systemInstruction }),
  })
  const responseText = response.text ? cleanJsonText(response.text) : ''
  if (!responseText) throw new Error('Gemini returned an empty ingest pages response')

  try {
    const pages = normalizeIngestPages(JSON.parse(responseText), summary)
    const skipped = pages.every((page) => page.action === 'skip')
      ? pages.map((page) => page.reason).filter(Boolean).join(' ') || 'No durable Knowledge contribution found.'
      : undefined
    return { sourcePath: options.rawStorageUrl ?? '', written: [], pages, summary, extractedText: canonicalMarkdown, fileKind: extracted.fileKind, skipped }
  } catch (error) {
    throw new Error(`Failed to parse Gemini ingest pages JSON: ${error instanceof Error ? error.message : 'invalid JSON'}`)
  }
}
