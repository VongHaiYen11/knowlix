import type { z } from 'zod'
import { parsePagination } from '../../utils/pagination.js'
import { uniqueCleanStrings } from '../../utils/text.js'
import { journalDay, journalEntryDate } from './journal.mapper.js'
import { journalRepository } from './journal.repository.js'
import type { journalEntrySchema } from './journal.schemas.js'

function groupJournalRows(rows: any[]) {
  const grouped = new Map<string, any[]>()
  for (const row of rows) {
    const date = journalEntryDate(row)
    grouped.set(date, [...(grouped.get(date) ?? []), row])
  }
  return Array.from(grouped.entries()).map(([date, entries]) => journalDay(date, entries))
}

export const journalService = {
  async list(userId: string, query: Record<string, unknown>) {
    const { page, pageSize, offset } = parsePagination(query)
    const params: unknown[] = [userId]
    const filters = ['user_id=$1']
    if (query.from) {
      params.push(String(query.from))
      filters.push(`entry_date >= $${params.length}`)
    }
    if (query.to) {
      params.push(String(query.to))
      filters.push(`entry_date <= $${params.length}`)
    }
    const result = await journalRepository.list(filters.join(' AND '), params, pageSize, offset)
    return { items: groupJournalRows(result.rows), page, pageSize, total: result.total }
  },

  async appendEntry(userId: string, date: string, entry: z.infer<typeof journalEntrySchema>) {
    await journalRepository.appendEntry(userId, date, {
      time: entry.time,
      text: entry.text,
      tags: uniqueCleanStrings(entry.tags),
    })
    return journalDay(date, await journalRepository.entriesForDate(userId, date))
  },
}
