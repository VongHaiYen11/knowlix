import path from 'node:path'
import { readFile } from 'node:fs/promises'
import mammoth from 'mammoth'
import type { z } from 'zod'
import { AppError, NotFoundError } from '../../errors/index.js'
import { parsePagination } from '../../utils/pagination.js'
import { excerpt } from '../../utils/text.js'
import { todayLabel } from '../../utils/date.js'
import { storageService } from '../../lib/storage.js'
import { sourceRow } from './sources.mapper.js'
import { binarySourceTypes, type sourceCreateSchema, type sourcePatchSchema } from './sources.schemas.js'
import { sourcesRepository } from './sources.repository.js'
import { aiCustomizationService } from '../ai-customization/ai-customization.service.js'
import { IngestSourceFileUseCase } from './use-cases/IngestSourceFile.usecase.js'
import { DeleteSourceUseCase } from './use-cases/DeleteSource.usecase.js'

function sourceTypeFromUpload(mimeType: string, filename: string) {
  const extension = filename.toLowerCase().split('.').pop()
  if (mimeType === 'application/pdf' || extension === 'pdf') return 'PDF'
  if (extension === 'docx') return 'DOCX'
  if (extension === 'txt') return 'TXT'
  if (extension === 'md' || extension === 'markdown') return 'Markdown'
  throw new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Unsupported file type. Upload PDF, DOCX, TXT, or Markdown files only.')
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function previewHtml(title: string, body: string) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: light dark; }
    body {
      margin: 0;
      padding: 40px;
      font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
      line-height: 1.7;
      color: #2f2a24;
      background: #fffaf2;
    }
    article {
      max-width: 820px;
      margin: 0 auto;
      padding: 40px;
      border: 1px solid #e5dccd;
      border-radius: 16px;
      background: #fffefd;
      box-shadow: 0 12px 36px rgba(47, 42, 36, 0.08);
    }
    h1, h2, h3 { line-height: 1.2; color: #2c2925; }
    p { margin: 1em 0; }
    table { width: 100%; border-collapse: collapse; }
    td, th { border: 1px solid #e5dccd; padding: 8px; }
    img { max-width: 100%; height: auto; }
  </style>
</head>
<body>
  <article>${body}</article>
</body>
</html>`
}

export const sourcesService = {
  async list(userId: string, query: Record<string, unknown>) {
    const { page, pageSize, offset } = parsePagination(query)
    const filters = ['user_id = $1']
    const params: unknown[] = [userId]
    for (const key of ['type', 'status', 'category'] as const) {
      if (query[key]) {
        params.push(String(query[key]))
        filters.push(`${key} = $${params.length}`)
      }
    }
    if (query.q) {
      params.push(`%${String(query.q)}%`)
      filters.push(`(title ILIKE $${params.length} OR excerpt ILIKE $${params.length})`)
    }
    const result = await sourcesRepository.list(filters.join(' AND '), params, pageSize, offset)
    return { items: result.rows.map(sourceRow), page, pageSize, total: result.total }
  },

  async get(userId: string, id: string) {
    const row = await sourcesRepository.find(userId, id)
    if (!row) throw new NotFoundError('Source not found')
    return sourceRow(row)
  },

  async create(userId: string, body: z.infer<typeof sourceCreateSchema>) {
    if (binarySourceTypes.has(body.type) && !body.fileId) throw new AppError(400, 'VALIDATION_ERROR', 'fileId is required for binary source types')
    const summaryObject = body.content
      ? await storageService.upload({
        userId,
        kind: 'source_summary',
        originalName: `${body.title}.md`,
        body: body.content,
        mimeType: 'text/markdown',
      })
      : undefined
    const row = await sourcesRepository.create({
      id: `source_${crypto.randomUUID()}`,
      userId,
      type: body.type,
      title: body.title,
      content: null,
      tags: body.tags,
      category: body.category,
      created: todayLabel(),
      status: body.status,
      meta: body.meta,
      excerpt: body.excerpt || excerpt(body.content ?? ''),
      fileId: body.fileId,
      rawStorageObjectId: null,
      extractedStorageObjectId: null,
      summaryStorageObjectId: summaryObject?.id ?? null,
      knowledgeTags: body.tags,
    })
    return sourceRow(row)
  },

  async update(userId: string, id: string, body: z.infer<typeof sourcePatchSchema>) {
    const current = await sourcesRepository.find(userId, id)
    if (!current) throw new NotFoundError('Source not found')
    const next = { ...sourceRow(current), ...body }
    const summaryObject = body.content
      ? await storageService.upload({
        userId,
        kind: 'source_summary',
        originalName: `${next.title}.md`,
        body: body.content,
        mimeType: 'text/markdown',
      })
      : undefined
    return sourceRow(await sourcesRepository.update({
      userId,
      id,
      type: next.type,
      title: next.title,
      content: null,
      tags: next.tags,
      category: next.category,
      status: next.status,
      meta: next.meta,
      excerpt: next.excerpt,
      fileId: body.fileId ?? current.file_id,
      rawStorageObjectId: current.raw_storage_object_id,
      extractedStorageObjectId: current.extracted_storage_object_id,
      summaryStorageObjectId: summaryObject?.id ?? current.summary_storage_object_id,
      knowledgeTags: next.knowledgeTags ?? next.tags,
    }))
  },

  async upload(userId: string, file: Express.Multer.File) {
    return new IngestSourceFileUseCase().execute(userId, file)
  },

  async file(userId: string, id: string) {
    const row = await sourcesRepository.file(userId, id)
    if (!row) throw new NotFoundError('File not found')
    if (row.storage_object_id) {
      const { buffer } = await storageService.download({ userId, storageObjectId: row.storage_object_id })
      return { buffer, mimeType: row.mime_type, name: row.name }
    }
    if (!row.raw_path) throw new NotFoundError('File not found')
    return { path: path.resolve(row.raw_path), mimeType: row.mime_type, name: row.name }
  },

  async filePreview(userId: string, id: string) {
    const file = await this.file(userId, id)
    const isDocx = file.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.toLowerCase().endsWith('.docx')
    if (!isDocx) throw new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Preview is only available for DOCX files.')
    const buffer = 'buffer' in file && file.buffer ? file.buffer : 'path' in file ? await readFile(file.path) : undefined
    if (!buffer) throw new NotFoundError('File not found')
    const result = await mammoth.convertToHtml({ buffer })
    return { html: previewHtml(file.name, result.value || '<p>No preview content available.</p>'), mimeType: 'text/html; charset=utf-8' }
  },

  async content(userId: string, id: string) {
    const row = await sourcesRepository.find(userId, id)
    if (!row) throw new NotFoundError('Source not found')
    if (!row.summary_storage_object_id) return ''
    const { text } = await storageService.readText({ userId, storageObjectId: row.summary_storage_object_id })
    return text
  },

  async delete(userId: string, id: string) {
    await new DeleteSourceUseCase().execute(userId, id)
  },
}
