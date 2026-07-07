import path from 'node:path'
import type { z } from 'zod'
import { AppError, NotFoundError } from '../../errors/index.js'
import { parsePagination } from '../../utils/pagination.js'
import { queryList } from '../../utils/query.js'
import { excerpt } from '../../utils/text.js'
import { todayLabel } from '../../utils/date.js'
import { saveRawUpload } from '../../wiki/ingest.js'
import { sourceRow } from './sources.mapper.js'
import { binarySourceTypes, type sourceCreateSchema, type sourcePatchSchema } from './sources.schemas.js'
import { sourcesRepository } from './sources.repository.js'
import { runBackgroundIngest } from './sources.ingest-service.js'

function sourceTypeFromUpload(mimeType: string, filename: string) {
  const extension = filename.toLowerCase().split('.').pop()
  if (mimeType === 'application/pdf' || extension === 'pdf') return 'PDF'
  if (mimeType.startsWith('image/')) return 'Image'
  if (mimeType.startsWith('audio/')) return 'Voice'
  if (extension === 'md' || extension === 'txt') return 'Note'
  if (extension === 'html' || extension === 'htm') return 'Article'
  return 'File'
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
    const row = await sourcesRepository.create({
      id: `source_${crypto.randomUUID()}`,
      userId,
      type: body.type,
      title: body.title,
      content: body.content,
      tags: body.tags,
      category: body.category,
      created: todayLabel(),
      status: body.status,
      meta: body.meta,
      excerpt: body.excerpt || excerpt(body.content ?? ''),
      fileId: body.fileId,
    })
    return sourceRow(row)
  },

  async update(userId: string, id: string, body: z.infer<typeof sourcePatchSchema>) {
    const current = await sourcesRepository.find(userId, id)
    if (!current) throw new NotFoundError('Source not found')
    const next = { ...sourceRow(current), ...body }
    return sourceRow(await sourcesRepository.update({
      userId,
      id,
      type: next.type,
      title: next.title,
      content: next.content,
      tags: next.tags,
      category: next.category,
      status: next.status,
      meta: next.meta,
      excerpt: next.excerpt,
      fileId: body.fileId ?? current.file_id,
    }))
  },

  async upload(userId: string, file: Express.Multer.File) {
    const fileId = `file_${crypto.randomUUID()}`
    const rawFilePath = await saveRawUpload({ fileId, originalName: file.originalname, buffer: file.buffer })
    await sourcesRepository.createUploadedFile({ id: fileId, userId, name: file.originalname, mimeType: file.mimetype, sizeBytes: file.size, rawPath: rawFilePath })

    const sourceId = `source_${crypto.randomUUID()}`
    const created = todayLabel()
    const uploadedType = sourceTypeFromUpload(file.mimetype, file.originalname)
    const sourceInsert = await sourcesRepository.create({
      id: sourceId,
      userId,
      type: uploadedType,
      title: file.originalname,
      content: null,
      tags: [],
      category: 'Uncategorized',
      created,
      status: 'Processing',
      meta: `${file.originalname} - ${Math.ceil(file.size / 1024)} KB`,
      excerpt: excerpt(file.originalname),
      fileId,
    })

    runBackgroundIngest({ userId, fileId, sourceId, rawFilePath, originalName: file.originalname, created, uploadedType }).catch((err) => {
      console.error('[Ingest] Unhandled background ingest rejection:', err)
    })

    return {
      fileId,
      name: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      rawPath: rawFilePath,
      ingest: { status: 'pending', written: [], message: undefined, source: sourceRow(sourceInsert), knowledge: [] },
    }
  },

  async file(userId: string, id: string) {
    const row = await sourcesRepository.file(userId, id)
    if (!row || !row.raw_path) throw new NotFoundError('File not found')
    return { path: path.resolve(row.raw_path), mimeType: row.mime_type, name: row.name }
  },

  async delete(userId: string, id: string) {
    const slugs = await sourcesRepository.relatedKnowledgeSlugs(userId, id)
    await sourcesRepository.deleteRelatedKnowledge(userId, slugs)
    await sourcesRepository.delete(userId, id)
  },
}
