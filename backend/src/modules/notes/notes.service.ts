import type { z } from 'zod'
import { AppError, NotFoundError } from '../../errors/index.js'
import { parsePagination } from '../../utils/pagination.js'
import { excerpt, wordCount } from '../../utils/text.js'
import { storageService } from '../../lib/storage.js'
import { todayLabel } from '../../utils/date.js'
import { sourcesRepository } from '../sources/sources.repository.js'
import { runBackgroundIngest } from '../sources/sources.ingest-service.js'
import { aiCustomizationService } from '../ai-customization/ai-customization.service.js'
import { noteRow } from './notes.mapper.js'
import { notesRepository } from './notes.repository.js'
import type { noteCreateSchema, notePatchSchema } from './notes.schemas.js'

export const notesService = {
  async list(userId: string, query: Record<string, unknown>) {
    const { page, pageSize, offset } = parsePagination(query)
    const result = await notesRepository.list(userId, pageSize, offset)
    return { items: result.rows.map(noteRow), page, pageSize, total: result.total }
  },
  async get(userId: string, id: string) {
    const row = await notesRepository.find(userId, id)
    if (!row) throw new NotFoundError('Note not found')
    return noteRow(row)
  },
  async create(userId: string, body: z.infer<typeof noteCreateSchema>) {
    const storageObject = await storageService.upload({
      userId,
      kind: 'note_markdown',
      originalName: `${body.title}.md`,
      body: body.content,
      mimeType: 'text/markdown',
    })
    const row = await notesRepository.create({
      id: body.id ?? `note_${crypto.randomUUID()}`,
      userId,
      title: body.title,
      excerpt: excerpt(body.content, 120),
      updated: 'Saved just now',
      words: wordCount(body.content),
      tags: body.tags ?? [],
      storageObjectId: storageObject.id,
    })
    return noteRow(row)
  },
  async update(userId: string, id: string, body: z.infer<typeof notePatchSchema>) {
    const current = await notesRepository.find(userId, id)
    if (!current) throw new NotFoundError('Note not found')
    const existingContent = current.storage_object_id ? (await storageService.readText({ userId, storageObjectId: current.storage_object_id })).text : current.content
    const content = body.content ?? existingContent
    const title = body.title ?? content.match(/^#\s+(.+)/m)?.[1] ?? current.title
    const storageObject = body.content
      ? await storageService.upload({
        userId,
        kind: 'note_markdown',
        originalName: `${title}.md`,
        body: content,
        mimeType: 'text/markdown',
      })
      : undefined
    const row = await notesRepository.update({
      userId,
      id,
      title,
      excerpt: excerpt(content, 120),
      updated: 'Saved just now',
      words: wordCount(content),
      tags: body.tags ?? current.tags,
      storageObjectId: storageObject?.id ?? current.storage_object_id,
    })
    return noteRow(row)
  },
  async content(userId: string, id: string) {
    const row = await notesRepository.find(userId, id)
    if (!row) throw new NotFoundError('Note not found')
    if (!row.storage_object_id) return ''
    const { text } = await storageService.readText({ userId, storageObjectId: row.storage_object_id })
    return text
  },
  async promoteToSource(userId: string, id: string) {
    const row = await notesRepository.find(userId, id)
    if (!row) throw new NotFoundError('Note not found')
    const content = row.storage_object_id ? (await storageService.readText({ userId, storageObjectId: row.storage_object_id })).text : row.content
    if (!content.trim()) throw new AppError(400, 'VALIDATION_ERROR', 'Note is empty')

    const originalName = `${row.title || 'Note'}.md`
    const rawObject = await storageService.upload({
      userId,
      kind: 'raw_source',
      originalName,
      body: content,
      mimeType: 'text/markdown',
    })
    const fileId = `file_${crypto.randomUUID()}`
    await sourcesRepository.createUploadedFile({
      id: fileId,
      userId,
      name: originalName,
      mimeType: 'text/markdown',
      sizeBytes: Buffer.byteLength(content),
      rawPath: rawObject.url,
      storageObjectId: rawObject.id,
    })

    const sourceId = `source_${crypto.randomUUID()}`
    const created = todayLabel()
    const sourceInsert = await sourcesRepository.create({
      id: sourceId,
      userId,
      type: 'Markdown',
      title: row.title || 'Untitled note',
      content: null,
      tags: row.tags ?? [],
      category: 'Uncategorized',
      created,
      status: 'Processing',
      meta: `${originalName} - ${Math.ceil(Buffer.byteLength(content) / 1024)} KB`,
      excerpt: row.excerpt,
      fileId,
      rawStorageObjectId: rawObject.id,
      extractedStorageObjectId: null,
      summaryStorageObjectId: null,
      knowledgeTags: row.tags ?? [],
    })

    await notesRepository.delete(userId, id)
    const customization = await aiCustomizationService.effectiveProfile(userId)
    runBackgroundIngest({ userId, fileId, sourceId, rawStorageObjectId: rawObject.id, rawStorageUrl: rawObject.url, originalName, created, uploadedType: 'Markdown', customization }).catch((err) => {
      console.error('[Ingest] Unhandled note promotion ingest rejection:', err)
    })

    return sourceInsert
  },
  delete: notesRepository.delete,
}
