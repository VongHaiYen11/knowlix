import { pool } from '../../database/pool.js'
import { uniqueCleanStrings } from '../../utils/text.js'

function jsonArray(value: unknown): any[] {
  return Array.isArray(value) ? value : []
}

function uniqueJson(values: any[], key: (value: any) => string): any[] {
  const seen = new Set<string>()
  return values.filter((value) => {
    const id = key(value)
    if (!id || seen.has(id)) return false
    seen.add(id)
    return true
  })
}

async function upsertKnowledgeSourceLink(input: { userId: string; slug: string; sourceId: string; relation: string }) {
  await pool.query(
    `INSERT INTO knowledge_source_links (user_id,slug,source_id,relation)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (user_id, slug, source_id) DO UPDATE SET relation=EXCLUDED.relation`,
    [input.userId, input.slug, input.sourceId, input.relation],
  )
}

export const sourceIngestionRepository = {
  async findKnowledgeCandidates(userId: string, query: string, embedding: number[], limit: number) {
    if (embedding.length) {
      const { rows } = await pool.query(
        `SELECT slug,title,overview,category,knowledge_tags AS tags,markdown_storage_object_id,
          ts_rank_cd(COALESCE(search_vector, to_tsvector('simple', title || ' ' || overview || ' ' || array_to_string(knowledge_tags, ' '))), plainto_tsquery('simple', $2)) AS fts_score,
          1 - (embedding <=> $3::vector) AS vector_score
         FROM knowledge_entries
         WHERE user_id=$1
           AND (
            $2 = ''
            OR COALESCE(search_vector, to_tsvector('simple', title || ' ' || overview || ' ' || array_to_string(knowledge_tags, ' '))) @@ plainto_tsquery('simple', $2)
            OR title ILIKE '%' || $2 || '%'
            OR overview ILIKE '%' || $2 || '%'
            OR embedding <=> $3::vector < 0.35
           )
         ORDER BY
           (0.7 * GREATEST(0, 1 - (embedding <=> $3::vector)))
           + (0.3 * LEAST(1, ts_rank_cd(COALESCE(search_vector, to_tsvector('simple', title || ' ' || overview || ' ' || array_to_string(knowledge_tags, ' '))), plainto_tsquery('simple', $2)) / 0.1))
           DESC,
           updated_at DESC
         LIMIT $4`,
        [userId, query, `[${embedding.join(',')}]`, limit],
      )
      return rows
    }

    const { rows } = await pool.query(
      `SELECT slug,title,overview,category,knowledge_tags AS tags,markdown_storage_object_id,
        ts_rank_cd(COALESCE(search_vector, to_tsvector('simple', title || ' ' || overview || ' ' || array_to_string(knowledge_tags, ' '))), plainto_tsquery('simple', $2)) AS fts_score,
        0 AS vector_score
       FROM knowledge_entries
       WHERE user_id=$1
         AND (
          COALESCE(search_vector, to_tsvector('simple', title || ' ' || overview || ' ' || array_to_string(knowledge_tags, ' '))) @@ plainto_tsquery('simple', $2)
          OR title ILIKE '%' || $2 || '%'
          OR overview ILIKE '%' || $2 || '%'
         )
       ORDER BY
         ts_rank_cd(COALESCE(search_vector, to_tsvector('simple', title || ' ' || overview || ' ' || array_to_string(knowledge_tags, ' '))), plainto_tsquery('simple', $2)) DESC,
         updated_at DESC
       LIMIT $3`,
      [userId, query, limit],
    )
    return rows
  },

  async markSourceProcessed(input: {
    sourceId: string
    type: string
    title: string
    tags: string[]
    category: string
    status: string
    excerpt: string
    rawStorageObjectId: string
    extractedStorageObjectId: string | null
    summaryStorageObjectId: string | null
  }) {
    await pool.query(
      `UPDATE sources
       SET type=$1,title=$2,content=NULL,tags=$3,category=$4,status=$5,excerpt=$6,
        raw_storage_object_id=$7,extracted_storage_object_id=$8,summary_storage_object_id=$9,knowledge_tags=$10,updated_at=now()
       WHERE id=$11`,
      [
        input.type,
        input.title,
        input.tags,
        input.category,
        input.status,
        input.excerpt,
        input.rawStorageObjectId,
        input.extractedStorageObjectId,
        input.summaryStorageObjectId,
        input.tags,
        input.sourceId,
      ],
    )
  },

  async knowledgeSlugExists(userId: string, slug: string) {
    const result = await pool.query('SELECT 1 FROM knowledge_entries WHERE user_id=$1 AND slug=$2', [userId, slug])
    return Boolean(result.rowCount)
  },

  async linkSource(input: {
    userId: string
    slug: string
    sourceId: string
    sourceReference: unknown
    timelineItem: unknown
    updated: string
    relation: string
  }) {
    await pool.query(
      `UPDATE knowledge_entries
       SET source_list=(
         SELECT COALESCE(jsonb_agg(source_item), '[]'::jsonb)
         FROM (
           SELECT DISTINCT ON (source_item->>'id') source_item
           FROM jsonb_array_elements(source_list || $1::jsonb) AS source_items(source_item)
           ORDER BY source_item->>'id'
         ) deduped_sources
       ),
       timeline=timeline || $2::jsonb,
       updated=$3,
       updated_at=now()
       WHERE user_id=$4 AND slug=$5`,
      [JSON.stringify([input.sourceReference]), JSON.stringify([input.timelineItem]), input.updated, input.userId, input.slug],
    )
    await upsertKnowledgeSourceLink({ userId: input.userId, slug: input.slug, sourceId: input.sourceId, relation: input.relation })
  },

  async upsertKnowledge(input: {
    slug: string
    userId: string
    title: string
    overview: string
    category: string
    tags: string[]
    date: string
    readTime: string
    explanation: string[]
    related: unknown[]
    references: unknown[]
    sources: unknown[]
    timeline: unknown[]
    markdownStorageObjectId: string
    searchText: string
    embedding: number[]
  }) {
    await pool.query(
      `INSERT INTO knowledge_entries
        (slug,user_id,title,content,overview,category,tags,created,updated,read_time,key_ideas,explanation,examples,related,reference_list,source_list,timeline,markdown_storage_object_id,knowledge_tags,search_vector,embedding)
       VALUES ($1,$2,$3,NULL,$4,$5,$6,$7,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,to_tsvector('simple', $18),$19)
       ON CONFLICT (user_id, slug) DO UPDATE SET
        title=EXCLUDED.title,
        content=NULL,
        overview=EXCLUDED.overview,
        category=EXCLUDED.category,
        tags=(SELECT ARRAY(SELECT DISTINCT unnest(knowledge_entries.tags || EXCLUDED.tags))),
        updated=EXCLUDED.updated,
        read_time=EXCLUDED.read_time,
        explanation=EXCLUDED.explanation,
        related=EXCLUDED.related,
        reference_list=(
          SELECT COALESCE(jsonb_agg(reference_item), '[]'::jsonb)
          FROM (
            SELECT DISTINCT ON (reference_item->>'source', reference_item->>'label') reference_item
            FROM jsonb_array_elements(knowledge_entries.reference_list || EXCLUDED.reference_list) AS reference_items(reference_item)
            ORDER BY reference_item->>'source', reference_item->>'label'
          ) deduped_references
        ),
        source_list=(
          SELECT COALESCE(jsonb_agg(source_item), '[]'::jsonb)
          FROM (
            SELECT DISTINCT ON (source_item->>'id') source_item
            FROM jsonb_array_elements(knowledge_entries.source_list || EXCLUDED.source_list) AS source_items(source_item)
            ORDER BY source_item->>'id'
          ) deduped_sources
        ),
        markdown_storage_object_id=EXCLUDED.markdown_storage_object_id,
        knowledge_tags=(SELECT ARRAY(SELECT DISTINCT unnest(knowledge_entries.knowledge_tags || EXCLUDED.knowledge_tags))),
        search_vector=EXCLUDED.search_vector,
        embedding=EXCLUDED.embedding,
        timeline=knowledge_entries.timeline || EXCLUDED.timeline,
        updated_at=now()`,
      [
        input.slug,
        input.userId,
        input.title,
        input.overview,
        input.category,
        input.tags,
        input.date,
        input.readTime,
        JSON.stringify([]),
        JSON.stringify(input.explanation),
        JSON.stringify([]),
        JSON.stringify(input.related),
        JSON.stringify(input.references),
        JSON.stringify(input.sources),
        JSON.stringify(input.timeline),
        input.markdownStorageObjectId,
        input.tags,
        input.searchText,
        JSON.stringify(input.embedding),
      ],
    )
  },

  async createRevision(input: {
    id: string
    userId: string
    slug: string
    storageObjectId: string
    revisionType: string
    model: string
    reason: string
  }) {
    await pool.query(
      `INSERT INTO knowledge_revisions (id,user_id,slug,storage_object_id,revision_type,model,reason)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [input.id, input.userId, input.slug, input.storageObjectId, input.revisionType, input.model, input.reason],
    )
  },

  async linkKnowledgeSource(input: { userId: string; slug: string; sourceId: string; relation: string }) {
    await upsertKnowledgeSourceLink(input)
  },

  async collapseMergedKnowledge(input: {
    userId: string
    targetSlug: string
    targetTitle: string
    mergedSlugs: string[]
  }) {
    const obsoleteSlugs = input.mergedSlugs.filter((slug) => slug !== input.targetSlug)
    if (!obsoleteSlugs.length) return

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const { rows } = await client.query(
        `SELECT slug,tags,knowledge_tags,source_list,reference_list,timeline
         FROM knowledge_entries
         WHERE user_id=$1 AND slug = ANY($2::text[])
         FOR UPDATE`,
        [input.userId, input.mergedSlugs],
      )
      const foundSlugs = new Set(rows.map((row) => row.slug))
      if (!foundSlugs.has(input.targetSlug) || obsoleteSlugs.some((slug) => !foundSlugs.has(slug))) {
        throw new Error('One or more Knowledge pages selected by the ingest merge no longer exist')
      }

      const tags = uniqueCleanStrings(rows.flatMap((row) => row.tags ?? []))
      const knowledgeTags = uniqueCleanStrings(rows.flatMap((row) => row.knowledge_tags ?? []))
      const sources = uniqueJson(rows.flatMap((row) => jsonArray(row.source_list)), (value) => String(value?.id ?? value?.source ?? value?.title ?? ''))
      const references = uniqueJson(rows.flatMap((row) => jsonArray(row.reference_list)), (value) => `${String(value?.label ?? '')}::${String(value?.source ?? value?.id ?? '')}`)
      const timeline = uniqueJson(rows.flatMap((row) => jsonArray(row.timeline)), (value) => `${String(value?.occurredAt ?? value?.date ?? '')}::${String(value?.event ?? '')}`)

      await client.query(
        `UPDATE knowledge_entries
         SET tags=$1,knowledge_tags=$2,source_list=$3,reference_list=$4,timeline=$5,updated_at=now()
         WHERE user_id=$6 AND slug=$7`,
        [tags, knowledgeTags, JSON.stringify(sources), JSON.stringify(references), JSON.stringify(timeline), input.userId, input.targetSlug],
      )
      await client.query(
        `INSERT INTO knowledge_source_links (user_id,slug,source_id,relation)
         SELECT user_id,$3,source_id,'merged_from'
         FROM knowledge_source_links
         WHERE user_id=$1 AND slug = ANY($2::text[])
         ON CONFLICT (user_id,slug,source_id) DO UPDATE SET relation='merged_from'`,
        [input.userId, input.mergedSlugs, input.targetSlug],
      )
      await client.query(
        'UPDATE knowledge_revisions SET slug=$1 WHERE user_id=$2 AND slug = ANY($3::text[])',
        [input.targetSlug, input.userId, obsoleteSlugs],
      )

      const relatedRows = await client.query(
        'SELECT slug,related FROM knowledge_entries WHERE user_id=$1 AND jsonb_array_length(related) > 0 FOR UPDATE',
        [input.userId],
      )
      for (const row of relatedRows.rows) {
        const nextRelated = uniqueJson(
          jsonArray(row.related)
            .map((related) => obsoleteSlugs.includes(String(related?.slug ?? ''))
              ? { slug: input.targetSlug, title: input.targetTitle }
              : related)
            .filter((related) => String(related?.slug ?? '') !== row.slug)
            .filter((related) => !obsoleteSlugs.includes(String(related?.slug ?? ''))),
          (related) => String(related?.slug ?? ''),
        )
        if (JSON.stringify(nextRelated) !== JSON.stringify(jsonArray(row.related))) {
          await client.query(
            'UPDATE knowledge_entries SET related=$1,updated_at=now() WHERE user_id=$2 AND slug=$3',
            [JSON.stringify(nextRelated), input.userId, row.slug],
          )
        }
      }

      await client.query('DELETE FROM knowledge_source_links WHERE user_id=$1 AND slug = ANY($2::text[])', [input.userId, obsoleteSlugs])
      await client.query('DELETE FROM knowledge_entries WHERE user_id=$1 AND slug = ANY($2::text[])', [input.userId, obsoleteSlugs])
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  },

  async markSourceFailed(sourceId: string, message: string) {
    await pool.query("UPDATE sources SET status='Queued', excerpt=$1 WHERE id=$2", [message, sourceId])
  },
}

export type SourceIngestionRepository = typeof sourceIngestionRepository
