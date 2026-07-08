import { pool } from '../../database/pool.js'

export const notesRepository = {
  async list(userId: string, pageSize: number, offset: number) {
    const count = await pool.query('SELECT count(*)::int AS total FROM notes WHERE user_id=$1', [userId])
    const data = await pool.query('SELECT * FROM notes WHERE user_id=$1 ORDER BY updated_at DESC LIMIT $2 OFFSET $3', [userId, pageSize, offset])
    return { rows: data.rows, total: count.rows[0].total }
  },
  async find(userId: string, id: string) {
    const { rows } = await pool.query('SELECT * FROM notes WHERE user_id=$1 AND id=$2', [userId, id])
    return rows[0]
  },
  async create(input: any) {
    const { rows } = await pool.query(
      'INSERT INTO notes (id,user_id,title,excerpt,updated,words,content,tags,storage_object_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [input.id, input.userId, input.title, input.excerpt, input.updated, input.words, '', input.tags, input.storageObjectId],
    )
    return rows[0]
  },
  async update(input: any) {
    const { rows } = await pool.query(
      'UPDATE notes SET title=$1,excerpt=$2,updated=$3,words=$4,content=$5,tags=$6,storage_object_id=$7,updated_at=now() WHERE user_id=$8 AND id=$9 RETURNING *',
      [input.title, input.excerpt, input.updated, input.words, '', input.tags, input.storageObjectId, input.userId, input.id],
    )
    return rows[0]
  },
  delete(userId: string, id: string) {
    return pool.query('DELETE FROM notes WHERE user_id=$1 AND id=$2', [userId, id])
  },
}
