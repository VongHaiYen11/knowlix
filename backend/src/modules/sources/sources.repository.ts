import { pool } from '../../database/pool.js'

export const sourcesRepository = {
  async list(input: {
    userId: string
    type?: string
    status?: string
    category?: string
    query?: string
    pageSize: number
    offset: number
  }) {
    const filters = ['user_id = $1']
    const params: unknown[] = [input.userId]
    for (const key of ['type', 'status', 'category'] as const) {
      if (input[key]) {
        params.push(input[key])
        filters.push(`${key} = $${params.length}`)
      }
    }
    if (input.query) {
      params.push(`%${input.query}%`)
      filters.push(`(title ILIKE $${params.length} OR excerpt ILIKE $${params.length})`)
    }
    const where = filters.join(' AND ')
    const count = await pool.query(`SELECT count(*)::int AS total FROM sources WHERE ${where}`, params)
    const data = await pool.query(`SELECT * FROM sources WHERE ${where} ORDER BY updated_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, input.pageSize, input.offset])
    return { rows: data.rows, total: count.rows[0].total }
  },
  async find(userId: string, id: string) {
    const { rows } = await pool.query('SELECT * FROM sources WHERE user_id=$1 AND (id=$2 OR file_id=$2)', [userId, id])
    return rows[0]
  },
  async create(input: any) {
    const { rows } = await pool.query(
      `INSERT INTO sources (id,user_id,type,title,content,tags,category,created,status,meta,excerpt,file_id,raw_storage_object_id,extracted_storage_object_id,summary_storage_object_id,knowledge_tags)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
      [
        input.id,
        input.userId,
        input.type,
        input.title,
        null,
        input.tags,
        input.category,
        input.created,
        input.status,
        input.meta,
        input.excerpt,
        input.fileId,
        input.rawStorageObjectId,
        input.extractedStorageObjectId,
        input.summaryStorageObjectId,
        input.knowledgeTags ?? input.tags ?? [],
      ],
    )
    return rows[0]
  },
  async update(input: any) {
    const { rows } = await pool.query(
      `UPDATE sources SET type=$1,title=$2,content=$3,tags=$4,category=$5,status=$6,meta=$7,excerpt=$8,file_id=$9,
        raw_storage_object_id=$10,extracted_storage_object_id=$11,summary_storage_object_id=$12,knowledge_tags=$13,updated_at=now()
       WHERE user_id=$14 AND id=$15 RETURNING *`,
      [
        input.type,
        input.title,
        null,
        input.tags,
        input.category,
        input.status,
        input.meta,
        input.excerpt,
        input.fileId,
        input.rawStorageObjectId,
        input.extractedStorageObjectId,
        input.summaryStorageObjectId,
        input.knowledgeTags ?? input.tags ?? [],
        input.userId,
        input.id,
      ],
    )
    return rows[0]
  },
  async prepareReingest(input: {
    userId: string
    sourceId: string
    type: string
    fileId: string
    rawStorageObjectId: string
    meta: string
  }) {
    const { rows } = await pool.query(
      `UPDATE sources
       SET type=$1,status='Processing',file_id=$2,raw_storage_object_id=$3,meta=$4,updated_at=now()
       WHERE user_id=$5 AND id=$6
       RETURNING *`,
      [input.type, input.fileId, input.rawStorageObjectId, input.meta, input.userId, input.sourceId],
    )
    return rows[0]
  },
  async createUploadedFile(input: any) {
    await pool.query(
      'INSERT INTO uploaded_files (id,user_id,name,mime_type,size_bytes,raw_path,storage_object_id,ingest_status,ingest_outputs) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      [input.id, input.userId, input.name, input.mimeType, input.sizeBytes, input.rawPath, input.storageObjectId, 'pending', '[]'],
    )
  },
  async updateUploadedFileStatus(fileId: string, status: string, outputs: unknown[]) {
    await pool.query('UPDATE uploaded_files SET ingest_status=$1, ingest_outputs=$2 WHERE id=$3', [status, JSON.stringify(outputs), fileId])
  },
  async failUploadedFile(fileId: string) {
    await pool.query('UPDATE uploaded_files SET ingest_status=$1 WHERE id=$2', ['failed', fileId])
  },
  async file(userId: string, id: string) {
    const { rows } = await pool.query('SELECT raw_path, mime_type, name, storage_object_id FROM uploaded_files WHERE user_id=$1 AND id=$2', [userId, id])
    return rows[0]
  },
  async deleteWithKnowledgeDetach(userId: string, id: string) {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const sourceResult = await client.query(
        `SELECT sources.id,sources.title,storage_objects.url AS raw_storage_url
         FROM sources
         LEFT JOIN storage_objects ON storage_objects.id = sources.raw_storage_object_id
         WHERE sources.user_id=$1 AND sources.id=$2
         FOR UPDATE OF sources`,
        [userId, id],
      )
      const source = sourceResult.rows[0]
      if (!source) {
        await client.query('COMMIT')
        return { orphanSlugs: [], detachedSlugs: [] }
      }

      const relatedResult = await client.query(
        `WITH related_slugs AS (
           SELECT slug
           FROM knowledge_source_links
           WHERE user_id=$1 AND source_id=$2
           UNION
           SELECT slug
           FROM knowledge_entries
           WHERE user_id=$1
             AND jsonb_typeof(source_list) = 'array'
             AND source_list @> $3::jsonb
         )
         SELECT knowledge_entries.slug,knowledge_entries.source_list,
           (
             SELECT count(*)::int
             FROM knowledge_source_links
             WHERE knowledge_source_links.user_id=knowledge_entries.user_id
               AND knowledge_source_links.slug=knowledge_entries.slug
           ) AS linked_source_count
         FROM knowledge_entries
         WHERE user_id=$1 AND slug IN (SELECT slug FROM related_slugs)
         FOR UPDATE`,
        [userId, id, JSON.stringify([{ id }])],
      )
      const orphanSlugs = relatedResult.rows
        .filter((row: any) => {
          const linkedSourceCount = Number(row.linked_source_count ?? 0)
          if (linkedSourceCount > 0) return linkedSourceCount <= 1
          return Array.isArray(row.source_list) && row.source_list.filter((item: any) => item?.id).length <= 1
        })
        .map((row: any) => row.slug)
      const detachedSlugs = relatedResult.rows
        .filter((row: any) => !orphanSlugs.includes(row.slug))
        .map((row: any) => row.slug)

      if (orphanSlugs.length) {
        await client.query('DELETE FROM knowledge_source_links WHERE user_id=$1 AND slug = ANY($2::text[])', [userId, orphanSlugs])
        await client.query('DELETE FROM knowledge_entries WHERE user_id=$1 AND slug = ANY($2::text[])', [userId, orphanSlugs])
      }

      if (detachedSlugs.length) {
        await client.query(
          `UPDATE knowledge_entries
           SET source_list=(
              SELECT COALESCE(jsonb_agg(source_item), '[]'::jsonb)
              FROM jsonb_array_elements(
                CASE WHEN jsonb_typeof(source_list) = 'array' THEN source_list ELSE '[]'::jsonb END
              ) AS source_items(source_item)
              WHERE source_item->>'id' <> $1
           ),
           reference_list=(
              SELECT COALESCE(jsonb_agg(reference_item), '[]'::jsonb)
              FROM jsonb_array_elements(
                CASE WHEN jsonb_typeof(reference_list) = 'array' THEN reference_list ELSE '[]'::jsonb END
              ) AS reference_items(reference_item)
              WHERE NOT (
                ($2 <> '' AND reference_item->>'source' = $2)
                OR ($3 <> '' AND reference_item->>'label' = $3)
                OR reference_item->>'id' = $1
              )
           ),
           updated_at=now()
           WHERE user_id=$4 AND slug = ANY($5::text[])`,
          [id, source.raw_storage_url ?? '', source.title ?? '', userId, detachedSlugs],
        )
      }

      await client.query('DELETE FROM knowledge_source_links WHERE user_id=$1 AND source_id=$2', [userId, id])
      await client.query('DELETE FROM sources WHERE user_id=$1 AND id=$2', [userId, id])
      await client.query('COMMIT')
      return { orphanSlugs, detachedSlugs }
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  },
}
