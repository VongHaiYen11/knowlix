import path from 'node:path'
import type { z } from 'zod'
import { AppError, NotFoundError } from '../../errors/index.js'
import { parsePagination } from '../../utils/pagination.js'
import { queryList } from '../../utils/query.js'
import { excerpt } from '../../utils/text.js'
import { todayLabel } from '../../utils/date.js'
import { storageService } from '../../lib/storage.js'
import { sourceRow } from './sources.mapper.js'
import { binarySourceTypes, type sourceCreateSchema, type sourcePatchSchema } from './sources.schemas.js'
import { sourcesRepository } from './sources.repository.js'
import { runBackgroundIngest } from './sources.ingest-service.js'

function sourceTypeFromUpload(mimeType: string, filename: string) {
  const extension = filename.toLowerCase().split('.').pop()
  if (mimeType === 'application/pdf' || extension === 'pdf') return 'PDF'
  if (extension === 'docx') return 'DOCX'
  if (extension === 'txt') return 'TXT'
  if (extension === 'md' || extension === 'markdown') return 'Markdown'
  throw new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Unsupported file type. Upload PDF, DOCX, TXT, or Markdown files only.')
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
      workspaceLabels: [],
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
      workspaceLabels: next.workspaceLabels ?? [],
    }))
  },

  async upload(userId: string, file: Express.Multer.File) {
    const fileId = `file_${crypto.randomUUID()}`
    const rawObject = await storageService.upload({
      userId,
      kind: 'raw_source',
      originalName: file.originalname,
      body: file.buffer,
      mimeType: file.mimetype || 'application/octet-stream',
    })
    await sourcesRepository.createUploadedFile({ id: fileId, userId, name: file.originalname, mimeType: file.mimetype, sizeBytes: file.size, rawPath: rawObject.url, storageObjectId: rawObject.id })

    const sourceId = `source_${crypto.randomUUID()}`
    const created = todayLabel()
    const uploadedType = sourceTypeFromUpload(file.mimetype, file.originalname)
    const baseName = path.parse(file.originalname).name
    const sourceInsert = await sourcesRepository.create({
      id: sourceId,
      userId,
      type: uploadedType,
      title: baseName,
      content: null,
      tags: [],
      category: 'Uncategorized',
      created,
      status: 'Processing',
      meta: `${file.originalname} - ${Math.ceil(file.size / 1024)} KB`,
      excerpt: excerpt(baseName),
      fileId,
      rawStorageObjectId: rawObject.id,
      extractedStorageObjectId: null,
      summaryStorageObjectId: null,
      knowledgeTags: [],
      workspaceLabels: [],
    })

    runBackgroundIngest({ userId, fileId, sourceId, rawStorageObjectId: rawObject.id, rawStorageUrl: rawObject.url, originalName: file.originalname, created, uploadedType }).catch((err) => {
      console.error('[Ingest] Unhandled background ingest rejection:', err)
    })

    return {
      fileId,
      name: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      rawPath: rawObject.url,
      rawStorageObjectId: rawObject.id,
      ingest: { status: 'pending', written: [], message: undefined, source: sourceRow(sourceInsert), knowledge: [] },
    }
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

  async content(userId: string, id: string) {
    const row = await sourcesRepository.find(userId, id)
    if (!row) throw new NotFoundError('Source not found')
    if (!row.summary_storage_object_id) return ''
    const { text } = await storageService.readText({ userId, storageObjectId: row.summary_storage_object_id })
    return text
  },

  async delete(userId: string, id: string) {
    const slugs = await sourcesRepository.relatedKnowledgeSlugs(userId, id)
    await sourcesRepository.deleteRelatedKnowledge(userId, slugs)
    await sourcesRepository.delete(userId, id)
  },
}
