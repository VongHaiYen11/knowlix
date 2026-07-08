import path from 'node:path'
import mammoth from 'mammoth'
import pdf from 'pdf-parse/lib/pdf-parse.js'
import { env } from '../config/env.js'
import { getGeminiClient } from '../config/gemini.js'
import { excerpt } from '../utils/text.js'
import { getIngestSummaryPrompt, getIngestPagesPrompt } from '../prompts/index.js'

export type IngestAction = 'create' | 'update' | 'merge' | 'replace' | 'link_only' | 'skip'

export interface IngestPage {
  filename: string
  title: string
  overview: string
  body: string
  related: string[]
  action?: IngestAction
  targetSlug?: string
  reason?: string
}

export interface IngestSummary {
  title: string
  category: string
  tags: string[]
  body: string
  excerpt: string
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

export interface IngestRawFileOptions {
  originalName?: string
  uploadedType?: string
  rawStorageUrl?: string
  candidates?: Array<{
    slug: string
    title: string
    overview: string
    category: string
    tags: string[]
  }>
}

export interface ExtractedText {
  fileKind: string
  text: string
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

function normalizeAction(value: unknown): IngestAction {
  return value === 'update' || value === 'merge' || value === 'replace' || value === 'link_only' || value === 'skip' ? value : 'create'
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
    reason: typeof page.reason === 'string' ? page.reason.trim() : undefined,
  }
}

export function normalizeIngestSummary(input: unknown, fallback: { title: string; extractedText: string }): IngestSummary {
  const parsed = asRecord(input)
  const summaryRecord = asRecord(parsed.summary)
  const rawSummaryBody = typeof summaryRecord.body === 'string' && summaryRecord.body.trim() ? summaryRecord.body.trim() : fallback.extractedText
  
  const parsedTitle = cleanLeadingSectionNumber(rawSummaryBody.match(/^#\s+(.+)/m)?.[1]?.trim() ?? '')
  const summaryTitle = parsedTitle || cleanLeadingSectionNumber(fallback.title) || fallback.title
  const summaryBody = normalizeMarkdownTitle(rawSummaryBody, summaryTitle)
  const parsedExcerpt = typeof summaryRecord.excerpt === 'string' && summaryRecord.excerpt.trim() ? summaryRecord.excerpt.trim() : ''
  const cleanExcerpt = summaryBody.replace(/```[\s\S]*?```/g, '').replace(/[#*_>`|[\]-]/g, '').trim().slice(0, 180)

  return {
    title: summaryTitle,
    category: typeof summaryRecord.category === 'string' && summaryRecord.category.trim() ? summaryRecord.category.trim() : 'Uncategorized',
    tags: asStringArray(summaryRecord.tags),
    body: summaryBody,
    excerpt: parsedExcerpt || cleanExcerpt || excerpt(summaryBody),
  }
}

export function normalizeIngestPages(input: unknown, summary: IngestSummary): IngestPage[] {
  const parsed = asRecord(input)
  const pages = Array.isArray(parsed.pages)
    ? parsed.pages.map((page) => normalizePage(page, summary.title)).filter((page): page is IngestPage => Boolean(page))
    : []

  if (pages.length === 0) {
    pages.push({ filename: `${summary.title}.md`, title: summary.title, overview: summary.excerpt, body: summary.body, related: [], action: 'create' })
  }

  return pages
}

export async function extractText(buffer: Buffer, originalName: string): Promise<ExtractedText> {
  const extension = path.extname(originalName).toLowerCase()
  if (!supportedExtensions.has(extension)) {
    throw new Error(`Unsupported file extension: ${extension || 'none'}`)
  }
  if (extension === '.txt' || extension === '.md' || extension === '.markdown') {
    return { fileKind: extension === '.txt' ? 'Plain text' : 'Markdown', text: buffer.toString('utf8') }
  }
  if (extension === '.pdf') {
    const data = await pdf(buffer)
    return { fileKind: 'PDF', text: data.text }
  }
  const result = await mammoth.extractRawText({ buffer })
  return { fileKind: 'DOCX', text: result.value }
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
  const prompt = getIngestSummaryPrompt({
    originalName,
    uploadedType: options.uploadedType ?? 'File',
    fileKind: extracted.fileKind,
    extractedText,
  })

  const response = await getGeminiClient().models.generateContent({
    model: env.geminiModel,
    contents: prompt,
    config: {
      responseMimeType: 'application/json'
    }
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
  if (!extractedText) {
    throw new Error(`No readable text found in ${originalName}`)
  }

  const candidates = (options.candidates ?? []).map((candidate) => ({
    slug: candidate.slug,
    title: candidate.title,
    overview: candidate.overview,
    category: candidate.category,
    tags: candidate.tags,
  }))
  
  const prompt = getIngestPagesPrompt({
    originalName,
    uploadedType: options.uploadedType ?? 'File',
    fileKind: extracted.fileKind,
    candidates,
    extractedText,
    summaryExcerpt: summary.excerpt,
  })

  const response = await getGeminiClient().models.generateContent({
    model: env.geminiModel,
    contents: prompt,
    config: {
      responseMimeType: 'application/json'
    }
  })
  const responseText = response.text ? cleanJsonText(response.text) : ''
  if (!responseText) throw new Error('Gemini returned an empty ingest pages response')

  try {
    const pages = normalizeIngestPages(JSON.parse(responseText), summary)
    return { sourcePath: options.rawStorageUrl ?? '', written: [], pages, summary, extractedText, fileKind: extracted.fileKind }
  } catch (error) {
    throw new Error(`Failed to parse Gemini ingest pages JSON: ${error instanceof Error ? error.message : 'invalid JSON'}`)
  }
}
