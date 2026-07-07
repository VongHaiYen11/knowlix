import { pool } from '../../database/pool.js'

export const journalRepository = {
  async list(where: string, params: unknown[], pageSize: number, offset: number) {
    const count = await pool.query(`SELECT count(*)::int AS total FROM journal_days WHERE ${where}`, params)
    const data = await pool.query(`SELECT * FROM journal_days WHERE ${where} ORDER BY updated_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, pageSize, offset])
    return { rows: data.rows, total: count.rows[0].total }
  },
  async find(userId: string, date: string) {
    const { rows } = await pool.query('SELECT * FROM journal_days WHERE user_id=$1 AND date=$2', [userId, date])
    return rows[0]
  },
  async appendEntry(userId: string, date: string, weekday: string, entry: unknown) {
    const { rows } = await pool.query(
      `INSERT INTO journal_days (user_id,date,weekday,entries) VALUES ($1,$2,$3,$4)
       ON CONFLICT (user_id,date) DO UPDATE SET entries = journal_days.entries || EXCLUDED.entries, updated_at=now()
       RETURNING *`,
      [userId, date, weekday, JSON.stringify([entry])],
    )
    return rows[0]
  },
  async upsertDay(input: any) {
    const { rows } = await pool.query(
      `INSERT INTO journal_days (user_id,date,summary,learnings,connections)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (user_id,date) DO UPDATE SET summary=$3, learnings=$4, connections=$5, updated_at=now()
       RETURNING *`,
      [input.userId, input.date, input.summary, JSON.stringify(input.learnings), JSON.stringify(input.connections)],
    )
    return rows[0]
  },
}
