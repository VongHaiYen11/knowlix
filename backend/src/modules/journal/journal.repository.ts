import { randomUUID } from 'node:crypto'
import { pool } from '../../database/pool.js'

export interface JournalEntryInput {
  time: string
  text: string
  tags: string[]
}

export const journalRepository = {
  async list(input: { userId: string; from?: string; to?: string; pageSize: number; offset: number }) {
    const params: unknown[] = [input.userId]
    const filters = ['user_id=$1']
    if (input.from) {
      params.push(input.from)
      filters.push(`entry_date >= $${params.length}`)
    }
    if (input.to) {
      params.push(input.to)
      filters.push(`entry_date <= $${params.length}`)
    }
    const where = filters.join(' AND ')
    const count = await pool.query(`SELECT count(DISTINCT entry_date)::int AS total FROM journal_entries WHERE ${where}`, params)
    const data = await pool.query(
      `WITH selected_days AS (
        SELECT entry_date
        FROM journal_entries
        WHERE ${where}
        GROUP BY entry_date
        ORDER BY entry_date DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
       )
       SELECT journal_entries.id,journal_entries.entry_date::text AS entry_date,journal_entries.entry_time,journal_entries.text,journal_entries.tags,journal_entries.created_at,journal_entries.updated_at
       FROM journal_entries
       JOIN selected_days ON selected_days.entry_date = journal_entries.entry_date
       WHERE journal_entries.user_id=$1
       ORDER BY journal_entries.entry_date DESC, journal_entries.created_at ASC`,
      [...params, input.pageSize, input.offset],
    )
    return { rows: data.rows, total: count.rows[0].total }
  },

  async appendEntry(userId: string, date: string, entry: JournalEntryInput) {
    const id = `journal_${randomUUID()}`
    const { rows } = await pool.query(
      `INSERT INTO journal_entries (id,user_id,entry_date,entry_time,text,tags)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id,entry_date::text AS entry_date,entry_time,text,tags,created_at,updated_at`,
      [id, userId, date, entry.time, entry.text, entry.tags],
    )
    return rows[0]
  },

  async entriesForDate(userId: string, date: string) {
    const { rows } = await pool.query(
      `SELECT id,entry_date::text AS entry_date,entry_time,text,tags,created_at,updated_at
       FROM journal_entries
       WHERE user_id=$1 AND entry_date=$2
       ORDER BY created_at ASC`,
      [userId, date],
    )
    return rows
  },
}
