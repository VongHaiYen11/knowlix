import { pool } from '../../database/pool.js'

export const maintenanceRepository = {
  async knowledge(userId: string) {
    const { rows } = await pool.query('SELECT slug, title, overview, content, markdown_storage_object_id, tags, category, confidence, related FROM knowledge_entries WHERE user_id=$1', [userId])
    return rows
  },
  async markLowConfidence(userId: string, slug: string) {
    await pool.query('UPDATE knowledge_entries SET confidence=$1, updated_at=now() WHERE user_id=$2 AND slug=$3', ['low', userId, slug])
  },
}
