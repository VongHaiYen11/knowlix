import type { z } from 'zod'
import { parsePagination } from '../../utils/pagination.js'
import { journalRow } from './journal.mapper.js'
import { journalRepository } from './journal.repository.js'
import type { journalEntrySchema, journalPatchSchema } from './journal.schemas.js'

export const journalService = {
  async list(userId: string, query: Record<string, unknown>) {
    const { page, pageSize, offset } = parsePagination(query)
    const params: unknown[] = [userId]
    const filters = ['user_id=$1']
    if (query.from) {
      params.push(String(query.from))
      filters.push(`date >= $${params.length}`)
    }
    if (query.to) {
      params.push(String(query.to))
      filters.push(`date <= $${params.length}`)
    }
    const result = await journalRepository.list(filters.join(' AND '), params, pageSize, offset)
    return { items: result.rows.map(journalRow), page, pageSize, total: result.total }
  },
  async appendEntry(userId: string, date: string, entry: z.infer<typeof journalEntrySchema>) {
    const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date())
    return journalRow(await journalRepository.appendEntry(userId, date, weekday, entry))
  },
  async update(userId: string, date: string, body: z.infer<typeof journalPatchSchema>) {
    const current = await journalRepository.find(userId, date)
    return journalRow(await journalRepository.upsertDay({
      userId,
      date,
      summary: body.summary ?? current?.summary ?? '',
      learnings: body.learnings ?? current?.learnings ?? [],
      connections: body.connections ?? current?.connections ?? [],
    }))
  },
}
