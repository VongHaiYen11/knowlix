import type { z } from 'zod'
import { NotFoundError } from '../../errors/index.js'
import { parsePagination } from '../../utils/pagination.js'
import { excerpt, wordCount } from '../../utils/text.js'
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
    const row = await notesRepository.create({
      id: `note_${crypto.randomUUID()}`,
      userId,
      title: body.title,
      excerpt: excerpt(body.content, 120),
      updated: 'Saved just now',
      words: wordCount(body.content),
      content: body.content,
      tags: body.tags ?? [],
    })
    return noteRow(row)
  },
  async update(userId: string, id: string, body: z.infer<typeof notePatchSchema>) {
    const current = await notesRepository.find(userId, id)
    if (!current) throw new NotFoundError('Note not found')
    const content = body.content ?? current.content
    const title = body.title ?? content.match(/^#\s+(.+)/m)?.[1] ?? current.title
    const row = await notesRepository.update({
      userId,
      id,
      title,
      excerpt: excerpt(content, 120),
      updated: 'Saved just now',
      words: wordCount(content),
      content,
      tags: body.tags ?? current.tags,
    })
    return noteRow(row)
  },
  delete: notesRepository.delete,
}
