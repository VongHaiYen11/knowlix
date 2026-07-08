import path from 'node:path'
import mammoth from 'mammoth'
import pdf from 'pdf-parse/lib/pdf-parse.js'
import { env } from '../config/env.js'
import { getGeminiClient } from '../config/gemini.js'
import { excerpt } from '../utils/text.js'
import { getIngestPrompt } from '../prompts/index.js'

export type IngestAction = 'create' | 'update' | 'merge' | 'link_only' | 'skip'

export interface IngestPage {
  filename: string
  title: string
  body: string
  related: string[]
  action?: IngestAction
  targetSlug?: string
  reason?: string
}

export interface IngestResult {
  sourcePath: string
  written: string[]
  pages: IngestPage[]
  graphLinks: Array<{ source: string; target: string }>
  skipped?: string
  extractedText?: string
  fileKind?: string
  summary?: {
    title: string
    category: string
    tags: string[]
    workspaceLabels?: string[]
    body: string
    excerpt: string
  }
}

const supportedExtensions = new Set(['.pdf', '.docx', '.txt', '.md', '.markdown'])

interface IngestRawFileOptions {
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

interface ExtractedText {
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

function normalizeAction(value: unknown): IngestAction {
  return value === 'update' || value === 'merge' || value === 'link_only' || value === 'skip' ? value : 'create'
}

function normalizePage(value: unknown, fallbackTitle: string): IngestPage | null {
  const page = asRecord(value)
  const title = typeof page.title === 'string' && page.title.trim() ? page.title.trim() : fallbackTitle
  const body = typeof page.body === 'string' ? page.body.trim() : ''
  const action = normalizeAction(page.action)
  if (!body && !['link_only', 'skip'].includes(action)) return null
  const filename = typeof page.filename === 'string' && page.filename.trim() ? page.filename.trim() : `${title}.md`
  return {
    filename,
    title,
    body,
    related: asStringArray(page.related),
    action,
    targetSlug: typeof page.targetSlug === 'string' ? page.targetSlug.trim() : undefined,
    reason: typeof page.reason === 'string' ? page.reason.trim() : undefined,
  }
}

function normalizeIngestResult(input: unknown, fallback: { sourcePath: string; title: string; extractedText: string; fileKind: string }): IngestResult {
  const parsed = asRecord(input)
  const summaryRecord = asRecord(parsed.summary)
  const summaryBody = typeof summaryRecord.body === 'string' && summaryRecord.body.trim() ? summaryRecord.body.trim() : fallback.extractedText
  
  const parsedTitle = summaryBody.match(/^#\s+(.+)/m)?.[1]?.trim()
  const cleanExcerpt = summaryBody.replace(/```[\s\S]*?```/g, '').replace(/[#*_>`|[\]-]/g, '').trim().slice(0, 180)

  const summary = {
    title: parsedTitle || fallback.title,
    category: typeof summaryRecord.category === 'string' && summaryRecord.category.trim() ? summaryRecord.category.trim() : 'Uncategorized',
    tags: asStringArray(summaryRecord.tags),
    workspaceLabels: asStringArray(summaryRecord.workspaceLabels),
    body: summaryBody,
    excerpt: cleanExcerpt || excerpt(summaryBody),
  }
  const pages = Array.isArray(parsed.pages)
    ? parsed.pages.map((page) => normalizePage(page, summary.title)).filter((page): page is IngestPage => Boolean(page))
    : []

  if (pages.length === 0) {
    pages.push({ filename: `${summary.title}.md`, title: summary.title, body: summary.body, related: [], action: 'create' })
  }

  const graphLinks = Array.isArray(parsed.graphLinks)
    ? parsed.graphLinks.map((link) => {
      const record = asRecord(link)
      const source = typeof record.source === 'string' ? record.source.trim() : ''
      const target = typeof record.target === 'string' ? record.target.trim() : ''
      return source && target ? { source, target } : null
    }).filter((link): link is { source: string; target: string } => Boolean(link))
    : []

  return { sourcePath: fallback.sourcePath, written: [], pages, graphLinks, summary, extractedText: fallback.extractedText, fileKind: fallback.fileKind }
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

export async function ingestRawFile(buffer: Buffer, options: IngestRawFileOptions & { preExtractedText?: ExtractedText } = {}): Promise<IngestResult> {
  const originalName = options.originalName ?? 'upload'
  const extension = path.extname(originalName).toLowerCase()
  if (!supportedExtensions.has(extension)) {
    return { sourcePath: options.rawStorageUrl ?? '', written: [], pages: [], graphLinks: [], skipped: `Unsupported file extension: ${extension || 'none'}` }
  }

  const extracted = options.preExtractedText ?? await extractText(buffer, originalName)
  const extractedText = extracted.text.trim()
  if (!extractedText) {
    throw new Error(`No readable text found in ${originalName}`)
  }

  const title = titleFromName(originalName, extension)
  const candidates = (options.candidates ?? []).map((candidate) => ({
    slug: candidate.slug,
    title: candidate.title,
    overview: candidate.overview,
    category: candidate.category,
    tags: candidate.tags,
  }))
  const prompt = getIngestPrompt({
    originalName,
    uploadedType: options.uploadedType ?? 'File',
    fileKind: extracted.fileKind,
    rawStorageUrl: options.rawStorageUrl ?? 'not available',
    candidates,
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
  if (!responseText) throw new Error('Gemini returned an empty ingest response')

  try {
    return normalizeIngestResult(JSON.parse(responseText), { sourcePath: options.rawStorageUrl ?? '', title, extractedText, fileKind: extracted.fileKind })
  } catch (error) {
    throw new Error(`Failed to parse Gemini ingest JSON: ${error instanceof Error ? error.message : 'invalid JSON'}`)
  }
}
