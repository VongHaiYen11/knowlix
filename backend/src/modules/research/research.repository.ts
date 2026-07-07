import { pool } from '../../database/pool.js'
import { uniqueCleanStrings } from '../../utils/text.js'

export const researchRepository = {
  async scopedKnowledge(userId: string, scope: { tags: string[]; categories: string[] }) {
    const { rows } = await pool.query(
      `SELECT slug, title, overview, content, source_list FROM knowledge_entries
       WHERE user_id=$1
         AND ($2::text[] = '{}' OR tags && $2::text[])
         AND ($3::text[] = '{}' OR category = ANY($3::text[]))
       ORDER BY updated_at DESC`,
      [userId, uniqueCleanStrings(scope.tags), uniqueCleanStrings(scope.categories)],
    )
    return rows
  },
}
