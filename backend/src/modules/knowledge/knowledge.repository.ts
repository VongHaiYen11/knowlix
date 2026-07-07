import { pool } from '../../database/pool.js'

export const knowledgeRepository = {
  async list(input: { userId: string; where: string; params: unknown[]; pageSize: number; offset: number }) {
    const count = await pool.query(`SELECT count(*)::int AS total FROM knowledge_entries WHERE ${input.where}`, input.params)
    const data = await pool.query(
      `SELECT * FROM knowledge_entries WHERE ${input.where} ORDER BY updated_at DESC LIMIT $${input.params.length + 1} OFFSET $${input.params.length + 2}`,
      [...input.params, input.pageSize, input.offset],
    )
    return { rows: data.rows, total: count.rows[0].total }
  },

  async findBySlug(userId: string, slug: string) {
    const { rows } = await pool.query('SELECT * FROM knowledge_entries WHERE user_id=$1 AND slug=$2', [userId, slug])
    return rows[0]
  },

  async sourceRefs(userId: string, sourceIds: string[]) {
    if (!sourceIds.length) return []
    const { rows } = await pool.query('SELECT id, type, title FROM sources WHERE user_id=$1 AND id = ANY($2::text[])', [userId, sourceIds])
    return rows
  },

  async create(input: any) {
    const { rows } = await pool.query(
      `INSERT INTO knowledge_entries
        (slug,user_id,title,content,overview,category,tags,created,updated,source_list,timeline)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8,$9,$10)
       RETURNING *`,
      [input.slug, input.userId, input.title, input.content, input.overview, input.category, input.tags, input.created, JSON.stringify(input.sources), JSON.stringify(input.timeline)],
    )
    return rows[0]
  },

  async update(input: any) {
    const { rows } = await pool.query(
      `UPDATE knowledge_entries SET slug=$1,title=$2,content=$3,overview=$4,category=$5,tags=$6,updated=$7,read_time=$8,
        key_ideas=$9,explanation=$10,examples=$11,related=$12,reference_list=$13,source_list=$14,timeline=$15,updated_at=now()
       WHERE user_id=$16 AND slug=$17 RETURNING *`,
      [
        input.nextSlug,
        input.title,
        input.content,
        input.overview,
        input.category,
        input.tags,
        'Saved just now',
        input.readTime,
        JSON.stringify(input.keyIdeas),
        JSON.stringify(input.explanation),
        JSON.stringify(input.examples),
        JSON.stringify(input.related),
        JSON.stringify(input.references),
        JSON.stringify(input.sources),
        JSON.stringify(input.timeline),
        input.userId,
        input.currentSlug,
      ],
    )
    return rows[0]
  },

  async delete(userId: string, slug: string) {
    await pool.query('DELETE FROM graph_links WHERE user_id=$1 AND (source=$2 OR target=$2)', [userId, slug])
    await pool.query('DELETE FROM graph_nodes WHERE user_id=$1 AND id=$2', [userId, slug])
    await pool.query('DELETE FROM knowledge_entries WHERE user_id=$1 AND slug=$2', [userId, slug])
  },
}
