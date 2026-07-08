import fs from 'node:fs/promises'
import path from 'node:path'
import mammoth from 'mammoth'
import pdf from 'pdf-parse'
import { env } from '../config/env.js'
import { getGeminiClient } from '../config/gemini.js'
import { excerpt } from '../utils/text.js'

export interface IngestPage {
  filename: string
  title: string
  body: string
  related: string[]
}

export interface IngestResult {
  sourcePath: string
  written: string[]
  pages: IngestPage[]
  graphLinks: Array<{ source: string; target: string }>
  skipped?: string
  summary?: {
    title: string
    category: string
    tags: string[]
    body: string
    excerpt: string
  }
}

const supportedExtensions = new Set(['.pdf', '.docx', '.txt', '.md', '.markdown'])

interface IngestRawFileOptions {
  originalName?: string
  uploadedType?: string
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

function normalizePage(value: unknown, fallbackTitle: string): IngestPage | null {
  const page = asRecord(value)
  const title = typeof page.title === 'string' && page.title.trim() ? page.title.trim() : fallbackTitle
  const body = typeof page.body === 'string' ? page.body.trim() : ''
  if (!body) return null
  const filename = typeof page.filename === 'string' && page.filename.trim() ? page.filename.trim() : `${title}.md`
  return { filename, title, body, related: asStringArray(page.related) }
}

function normalizeIngestResult(input: unknown, fallback: { sourcePath: string; title: string; extractedText: string }): IngestResult {
  const parsed = asRecord(input)
  const summaryRecord = asRecord(parsed.summary)
  const summaryBody = typeof summaryRecord.body === 'string' && summaryRecord.body.trim() ? summaryRecord.body.trim() : fallback.extractedText
  const summary = {
    title: typeof summaryRecord.title === 'string' && summaryRecord.title.trim() ? summaryRecord.title.trim() : fallback.title,
    category: typeof summaryRecord.category === 'string' && summaryRecord.category.trim() ? summaryRecord.category.trim() : 'Uncategorized',
    tags: asStringArray(summaryRecord.tags),
    body: summaryBody,
    excerpt: typeof summaryRecord.excerpt === 'string' && summaryRecord.excerpt.trim() ? summaryRecord.excerpt.trim() : excerpt(summaryBody),
  }
  const pages = Array.isArray(parsed.pages)
    ? parsed.pages.map((page) => normalizePage(page, summary.title)).filter((page): page is IngestPage => Boolean(page))
    : []

  if (pages.length === 0) {
    pages.push({ filename: `${summary.title}.md`, title: summary.title, body: summary.body, related: [] })
  }

  const graphLinks = Array.isArray(parsed.graphLinks)
    ? parsed.graphLinks.map((link) => {
      const record = asRecord(link)
      const source = typeof record.source === 'string' ? record.source.trim() : ''
      const target = typeof record.target === 'string' ? record.target.trim() : ''
      return source && target ? { source, target } : null
    }).filter((link): link is { source: string; target: string } => Boolean(link))
    : []

  return { sourcePath: fallback.sourcePath, written: [], pages, graphLinks, summary }
}

export async function saveRawUpload(input: { fileId: string; originalName: string; buffer: Buffer }): Promise<string> {
  const date = new Date().toISOString().split('T')[0]
  const safeName = input.originalName.replace(/[^a-zA-Z0-9._-]+/g, '-')
  const dir = path.resolve(process.cwd(), '../raw/uploads', date)
  await fs.mkdir(dir, { recursive: true })
  const filePath = path.join(dir, `${input.fileId}-${safeName}`)
  await fs.writeFile(filePath, input.buffer)
  return filePath
}

async function extractText(filePath: string, originalName: string): Promise<ExtractedText> {
  const extension = path.extname(originalName || filePath).toLowerCase()
  if (!supportedExtensions.has(extension)) {
    throw new Error(`Unsupported file extension: ${extension || 'none'}`)
  }
  if (extension === '.txt' || extension === '.md' || extension === '.markdown') {
    return { fileKind: extension === '.txt' ? 'Plain text' : 'Markdown', text: await fs.readFile(filePath, 'utf8') }
  }
  if (extension === '.pdf') {
    const data = await pdf(await fs.readFile(filePath))
    return { fileKind: 'PDF', text: data.text }
  }
  const result = await mammoth.extractRawText({ path: filePath })
  return { fileKind: 'DOCX', text: result.value }
}

export async function ingestRawFile(filePath: string, options: IngestRawFileOptions = {}): Promise<IngestResult> {
  const originalName = options.originalName ?? path.basename(filePath)
  const extension = path.extname(originalName || filePath).toLowerCase()
  if (!supportedExtensions.has(extension)) {
    return { sourcePath: filePath, written: [], pages: [], graphLinks: [], skipped: `Unsupported file extension: ${extension || 'none'}` }
  }

  const extracted = await extractText(filePath, originalName)
  const extractedText = extracted.text.trim()
  if (!extractedText) {
    throw new Error(`No readable text found in ${originalName}`)
  }

  const title = titleFromName(originalName, extension)
  const prompt = `You are maintaining a private knowledge wiki from uploaded source files.
The backend has already converted the uploaded file to plain text. Use only the text below. Do not assume access to the original file bytes.

Return ONLY valid JSON in this shape:
{
  "summary": {
    "title": "Short source title",
    "category": "Short category",
    "tags": ["tag-one"],
    "body": "Concise source summary grounded in the extracted text",
    "excerpt": "One short excerpt"
  },
  "pages": [
    {
      "filename": "page-slug.md",
      "title": "Knowledge page title",
      "body": "Markdown knowledge page grounded in the extracted text",
      "related": ["Related concept"]
    }
  ],
  "graphLinks": [
    { "source": "Concept A", "target": "Concept B" }
  ]
}

Rules:
- Return plain JSON only. No markdown code fences.
- Keep every claim grounded in the extracted text.
- Preserve useful Markdown structure when the uploaded file is Markdown.
- If the source only supports one useful page, return one page.
- Use short, clean tags and concept names.

File metadata:
- Original filename: ${originalName}
- Uploaded source type: ${options.uploadedType ?? 'File'}
- Extracted file kind: ${extracted.fileKind}

Extracted text:
${extractedText}`

  const response = await getGeminiClient().models.generateContent({ model: env.geminiModel, contents: prompt })
  const responseText = response.text ? cleanJsonText(response.text) : ''
  if (!responseText) throw new Error('Gemini returned an empty ingest response')

  try {
    return normalizeIngestResult(JSON.parse(responseText), { sourcePath: filePath, title, extractedText })
  } catch (error) {
    throw new Error(`Failed to parse Gemini ingest JSON: ${error instanceof Error ? error.message : 'invalid JSON'}`)
  }
}
