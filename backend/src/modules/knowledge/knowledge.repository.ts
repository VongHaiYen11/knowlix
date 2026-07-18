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

  async findBySlugs(userId: string, slugs: string[]) {
    if (!slugs.length) return []
    const { rows } = await pool.query('SELECT * FROM knowledge_entries WHERE user_id=$1 AND slug = ANY($2::text[])', [userId, slugs])
    return rows
  },

  async sourceRefs(userId: string, sourceIds: string[]) {
    if (!sourceIds.length) return []
    const { rows } = await pool.query('SELECT id, type, title FROM sources WHERE user_id=$1 AND id = ANY($2::text[])', [userId, sourceIds])
    return rows
  },

  async create(input: any) {
    const { rows } = await pool.query(
      `INSERT INTO knowledge_entries
        (slug,user_id,title,content,overview,category,tags,created,updated,source_list,timeline,markdown_storage_object_id,knowledge_tags,search_vector,embedding)
       VALUES ($1,$2,$3,NULL,$4,$5,$6,$7,$7,$8,$9,$10,$11,to_tsvector('simple', $12),$13)
       RETURNING *`,
      [
        input.slug,
        input.userId,
        input.title,
        input.overview,
        input.category,
        input.tags,
        input.created,
        JSON.stringify(input.sources),
        JSON.stringify(input.timeline),
        input.markdownStorageObjectId,
        input.knowledgeTags ?? input.tags,
        `${input.title}\n${input.overview}\n${(input.knowledgeTags ?? input.tags ?? []).join(' ')}`,
        JSON.stringify(input.embedding ?? []),
      ],
    )
    return rows[0]
  },

  async update(input: any) {
    const { rows } = await pool.query(
      `UPDATE knowledge_entries SET slug=$1,title=$2,content=NULL,overview=$3,category=$4,tags=$5,updated=$6,read_time=$7,
        key_ideas=$8,explanation=$9,examples=$10,related=$11,reference_list=$12,source_list=$13,timeline=$14,
        markdown_storage_object_id=COALESCE($15, markdown_storage_object_id),knowledge_tags=$16,search_vector=to_tsvector('simple', $17),embedding=$18,updated_at=now()
       WHERE user_id=$19 AND slug=$20 RETURNING *`,
      [
        input.nextSlug,
        input.title,
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
        input.markdownStorageObjectId ?? null,
        input.knowledgeTags ?? input.tags,
        `${input.title}\n${input.overview}\n${(input.knowledgeTags ?? input.tags ?? []).join(' ')}`,
        JSON.stringify(input.embedding ?? []),
        input.userId,
        input.currentSlug,
      ],
    )
    return rows[0]
  },

  async createRevision(input: any) {
    await pool.query(
      `INSERT INTO knowledge_revisions (id,user_id,slug,storage_object_id,revision_type,model,reason)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [input.id, input.userId, input.slug, input.storageObjectId, input.revisionType, input.model ?? '', input.reason ?? ''],
    )
  },

  async delete(userId: string, slug: string) {
    await pool.query('DELETE FROM knowledge_entries WHERE user_id=$1 AND slug=$2', [userId, slug])
  },

  async deleteMany(userId: string, slugs: string[]) {
    if (!slugs.length) return
    await pool.query('DELETE FROM knowledge_entries WHERE user_id=$1 AND slug = ANY($2::text[])', [userId, slugs])
  },

  async deleteSourceLinks(userId: string, slugs: string[]) {
    if (!slugs.length) return
    await pool.query('DELETE FROM knowledge_source_links WHERE user_id=$1 AND slug = ANY($2::text[])', [userId, slugs])
  },

  async upsertSourceLinks(userId: string, slug: string, sources: any[], relation = 'supports') {
    for (const source of sources) {
      if (!source?.id) continue
      await pool.query(
        `INSERT INTO knowledge_source_links (user_id,slug,source_id,relation)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (user_id, slug, source_id) DO UPDATE SET relation=EXCLUDED.relation`,
        [userId, slug, source.id, relation],
      )
    }
  },

  async replaceWithMerged(input: any) {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query('DELETE FROM knowledge_source_links WHERE user_id=$1 AND slug = ANY($2::text[])', [input.userId, input.sourceSlugs])
      await client.query('DELETE FROM knowledge_entries WHERE user_id=$1 AND slug = ANY($2::text[])', [input.userId, input.sourceSlugs])
      const created = await client.query(
        `INSERT INTO knowledge_entries
          (slug,user_id,title,content,overview,category,tags,created,updated,source_list,timeline,markdown_storage_object_id,knowledge_tags,search_vector,embedding)
         VALUES ($1,$2,$3,NULL,$4,$5,$6,$7,$7,$8,$9,$10,$11,to_tsvector('simple', $12),$13)
         RETURNING *`,
        [
          input.slug,
          input.userId,
          input.title,
          input.overview,
          input.category,
          input.tags,
          input.created,
          JSON.stringify(input.sources),
          JSON.stringify(input.timeline),
          input.markdownStorageObjectId,
          input.knowledgeTags ?? input.tags,
          `${input.title}\n${input.overview}\n${(input.knowledgeTags ?? input.tags ?? []).join(' ')}`,
          JSON.stringify(input.embedding ?? []),
        ],
      )
      const updated = await client.query(
        `UPDATE knowledge_entries SET related=$1,reference_list=$2,updated_at=now()
         WHERE user_id=$3 AND slug=$4 RETURNING *`,
        [
          JSON.stringify(input.related),
          JSON.stringify(input.references),
          input.userId,
          input.slug,
        ],
      )
      for (const source of input.sources ?? []) {
        if (!source?.id) continue
        await client.query(
          `INSERT INTO knowledge_source_links (user_id,slug,source_id,relation)
           VALUES ($1,$2,$3,$4)
           ON CONFLICT (user_id, slug, source_id) DO UPDATE SET relation=EXCLUDED.relation`,
          [input.userId, input.slug, source.id, 'merged_from'],
        )
      }
      await client.query(
        `INSERT INTO knowledge_revisions (id,user_id,slug,storage_object_id,revision_type,model,reason)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [input.revisionId, input.userId, input.slug, input.markdownStorageObjectId, input.revisionType, input.model ?? '', input.reason ?? ''],
      )
      await client.query('COMMIT')
      return updated.rows[0] ?? created.rows[0]
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  },
}
