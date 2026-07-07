import { pool } from '../../database/pool.js'

export function graphPosition(slug: string) {
  let hash = 0
  for (const character of slug) hash = (hash * 31 + character.charCodeAt(0)) >>> 0
  return {
    x: Number((((hash % 80) + 10) / 100).toFixed(2)),
    y: Number(((((hash >>> 8) % 80) + 10) / 100).toFixed(2)),
  }
}

export const graphRepository = {
  async upsertNode(input: { userId: string; slug: string; label: string; category: string; tags: string[] }) {
    const position = graphPosition(input.slug)
    await pool.query(
      `INSERT INTO graph_nodes (id,user_id,label,category,tags,x,y)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (user_id, id) DO UPDATE SET label=EXCLUDED.label, category=EXCLUDED.category, tags=EXCLUDED.tags`,
      [input.slug, input.userId, input.label, input.category, input.tags, position.x, position.y],
    )
  },
  async link(userId: string, source: string, target: string) {
    await pool.query(
      `INSERT INTO graph_links (user_id,source,target)
       VALUES ($1,$2,$3)
       ON CONFLICT (user_id, source, target) DO NOTHING`,
      [userId, source, target],
    )
  },
  async list(where: string, params: unknown[]) {
    const nodes = await pool.query(`SELECT id,label,category,tags,x,y FROM graph_nodes WHERE ${where}`, params)
    const ids = nodes.rows.map((row) => row.id)
    const links = ids.length
      ? await pool.query('SELECT source,target FROM graph_links WHERE user_id=$1 AND source = ANY($2::text[]) AND target = ANY($2::text[])', [params[0], ids])
      : { rows: [] }
    return { nodes: nodes.rows, links: links.rows }
  },
}
