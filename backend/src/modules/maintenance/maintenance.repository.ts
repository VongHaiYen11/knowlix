import { pool } from '../../database/pool.js'

export const maintenanceRepository = {
  async knowledge(userId: string) {
    const { rows } = await pool.query('SELECT slug, title, overview, content, markdown_storage_object_id, tags, category, confidence FROM knowledge_entries WHERE user_id=$1', [userId])
    return rows
  },
  async links(userId: string) {
    const { rows } = await pool.query('SELECT source, target FROM graph_links WHERE user_id=$1', [userId])
    return rows
  },
  async addSuggestedNode(userId: string, slug: string) {
    await pool.query(
      `INSERT INTO graph_nodes (id,user_id,label,category,tags,x,y)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (user_id, id) DO NOTHING`,
      [slug, userId, slug, 'Suggested', [], 0.5, 0.5],
    )
  },
  async addLink(userId: string, source: string, target: string) {
    await pool.query(
      `INSERT INTO graph_links (user_id,source,target)
       VALUES ($1,$2,$3)
       ON CONFLICT (user_id, source, target) DO NOTHING`,
      [userId, source, target],
    )
  },
  async markLowConfidence(userId: string, slug: string) {
    await pool.query('UPDATE knowledge_entries SET confidence=$1, updated_at=now() WHERE user_id=$2 AND slug=$3', ['low', userId, slug])
  },
}
