import { pool } from '../../database/pool.js'

export const sourcesRepository = {
  async list(where: string, params: unknown[], pageSize: number, offset: number) {
    const count = await pool.query(`SELECT count(*)::int AS total FROM sources WHERE ${where}`, params)
    const data = await pool.query(`SELECT * FROM sources WHERE ${where} ORDER BY updated_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, pageSize, offset])
    return { rows: data.rows, total: count.rows[0].total }
  },
  async find(userId: string, id: string) {
    const { rows } = await pool.query('SELECT * FROM sources WHERE user_id=$1 AND (id=$2 OR file_id=$2)', [userId, id])
    return rows[0]
  },
  async create(input: any) {
    const { rows } = await pool.query(
      `INSERT INTO sources (id,user_id,type,title,content,tags,category,created,status,meta,excerpt,file_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [input.id, input.userId, input.type, input.title, input.content, input.tags, input.category, input.created, input.status, input.meta, input.excerpt, input.fileId],
    )
    return rows[0]
  },
  async update(input: any) {
    const { rows } = await pool.query(
      `UPDATE sources SET type=$1,title=$2,content=$3,tags=$4,category=$5,status=$6,meta=$7,excerpt=$8,file_id=$9,updated_at=now()
       WHERE user_id=$10 AND id=$11 RETURNING *`,
      [input.type, input.title, input.content, input.tags, input.category, input.status, input.meta, input.excerpt, input.fileId, input.userId, input.id],
    )
    return rows[0]
  },
  async createUploadedFile(input: any) {
    await pool.query(
      'INSERT INTO uploaded_files (id,user_id,name,mime_type,size_bytes,raw_path,ingest_status,ingest_outputs) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
      [input.id, input.userId, input.name, input.mimeType, input.sizeBytes, input.rawPath, 'pending', '[]'],
    )
  },
  async updateUploadedFileStatus(fileId: string, status: string, outputs: unknown[]) {
    await pool.query('UPDATE uploaded_files SET ingest_status=$1, ingest_outputs=$2 WHERE id=$3', [status, JSON.stringify(outputs), fileId])
  },
  async failUploadedFile(fileId: string) {
    await pool.query('UPDATE uploaded_files SET ingest_status=$1 WHERE id=$2', ['failed', fileId])
  },
  async file(userId: string, id: string) {
    const { rows } = await pool.query('SELECT raw_path, mime_type, name FROM uploaded_files WHERE user_id=$1 AND id=$2', [userId, id])
    return rows[0]
  },
  async relatedKnowledgeSlugs(userId: string, sourceId: string) {
    const { rows } = await pool.query('SELECT slug FROM knowledge_entries WHERE user_id=$1 AND source_list @> $2::jsonb', [userId, JSON.stringify([{ id: sourceId }])])
    return rows.map((row: any) => row.slug)
  },
  async deleteRelatedKnowledge(userId: string, slugs: string[]) {
    if (!slugs.length) return
    await pool.query('DELETE FROM graph_links WHERE user_id=$1 AND (source = ANY($2::text[]) OR target = ANY($2::text[]))', [userId, slugs])
    await pool.query('DELETE FROM graph_nodes WHERE user_id=$1 AND id = ANY($2::text[])', [userId, slugs])
    await pool.query('DELETE FROM knowledge_entries WHERE user_id=$1 AND slug = ANY($2::text[])', [userId, slugs])
    await pool.query(
      `DELETE FROM graph_links
       WHERE user_id=$1
         AND source NOT IN (SELECT slug FROM knowledge_entries WHERE user_id=$1)
         AND target NOT IN (SELECT slug FROM knowledge_entries WHERE user_id=$1)`,
      [userId],
    )
    await pool.query(
      `DELETE FROM graph_nodes
       WHERE user_id=$1
         AND id NOT IN (SELECT slug FROM knowledge_entries WHERE user_id=$1)
         AND id NOT IN (
           SELECT DISTINCT source FROM graph_links WHERE user_id=$1
           UNION
           SELECT DISTINCT target FROM graph_links WHERE user_id=$1
         )`,
      [userId],
    )
  },
  async delete(userId: string, id: string) {
    await pool.query('DELETE FROM sources WHERE user_id=$1 AND id=$2', [userId, id])
  },
}
