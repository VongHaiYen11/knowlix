import { pool } from '../../database/pool.js'
import { uniqueCleanStrings } from '../../utils/text.js'

export interface ResearchThreadInput {
  id: string
  title: string
  messages: Array<{ id: string; role: 'user' | 'assistant'; content: string }>
  scope: { tags: string[]; categories: string[]; dateRange?: string }
  createdAt?: string
  updatedAt?: string
  titleManuallyEdited: boolean
}

export const researchRepository = {
  async scopedKnowledge(userId: string, scope: { tags: string[]; categories: string[] }) {
    const { rows } = await pool.query(
      `SELECT slug, title, overview, markdown_storage_object_id, source_list, knowledge_tags AS tags, category
       WHERE user_id=$1
         AND ($2::text[] = '{}' OR knowledge_tags && $2::text[])
         AND ($3::text[] = '{}' OR category = ANY($3::text[]))
       ORDER BY updated_at DESC`,
      [userId, uniqueCleanStrings(scope.tags), uniqueCleanStrings(scope.categories)],
    )
    return rows
  },

  async retrieveCandidates(userId: string, input: { question: string; scope: { tags: string[]; categories: string[] }; limit?: number }) {
    const tags = uniqueCleanStrings(input.scope.tags)
    const categories = uniqueCleanStrings(input.scope.categories)
    const limit = input.limit ?? 12
    const { rows } = await pool.query(
      `SELECT slug,title,overview,category,knowledge_tags AS tags,workspace_labels,markdown_storage_object_id,source_list,embedding,
        ts_rank_cd(COALESCE(search_vector, to_tsvector('simple', title || ' ' || overview || ' ' || array_to_string(knowledge_tags, ' '))), plainto_tsquery('simple', $4)) AS fts_score
       FROM knowledge_entries
       WHERE user_id=$1
         AND ($2::text[] = '{}' OR knowledge_tags && $2::text[])
         AND ($3::text[] = '{}' OR category = ANY($3::text[]))
         AND (
          $4 = ''
          OR COALESCE(search_vector, to_tsvector('simple', title || ' ' || overview || ' ' || array_to_string(knowledge_tags, ' '))) @@ plainto_tsquery('simple', $4)
          OR title ILIKE '%' || $4 || '%'
          OR overview ILIKE '%' || $4 || '%'
         )
       ORDER BY fts_score DESC, updated_at DESC
       LIMIT $5`,
      [userId, tags, categories, input.question.trim(), limit],
    )
    return rows
  },

  async threads(userId: string) {
    const threadResult = await pool.query(
      `SELECT id,title,scope,title_manually_edited,created_at,updated_at
       FROM research_threads
       WHERE user_id=$1
       ORDER BY updated_at DESC`,
      [userId],
    )
    const ids = threadResult.rows.map((row) => row.id)
    const messageResult = ids.length
      ? await pool.query(
        `SELECT thread_id,id,role,content
         FROM research_messages
         WHERE user_id=$1 AND thread_id = ANY($2::text[])
         ORDER BY thread_id, position ASC, created_at ASC`,
        [userId, ids],
      )
      : { rows: [] }
    const messagesByThread = new Map<string, any[]>()
    for (const message of messageResult.rows) {
      const current = messagesByThread.get(message.thread_id) ?? []
      current.push({ id: message.id, role: message.role, content: message.content })
      messagesByThread.set(message.thread_id, current)
    }
    return threadResult.rows.map((row) => ({
      ...row,
      messages: messagesByThread.get(row.id) ?? [],
    }))
  },

  async upsertThread(userId: string, thread: ResearchThreadInput) {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const { rows } = await client.query(
        `INSERT INTO research_threads (id,user_id,title,scope,title_manually_edited,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,COALESCE($6::timestamptz, now()),COALESCE($7::timestamptz, now()))
         ON CONFLICT (id) DO UPDATE SET
          title=EXCLUDED.title,
          scope=EXCLUDED.scope,
          title_manually_edited=EXCLUDED.title_manually_edited,
          updated_at=EXCLUDED.updated_at
         WHERE research_threads.user_id=EXCLUDED.user_id
         RETURNING id,title,scope,title_manually_edited,created_at,updated_at`,
        [
          thread.id,
          userId,
          thread.title || 'Untitled',
          JSON.stringify(thread.scope),
          thread.titleManuallyEdited,
          thread.createdAt ?? null,
          thread.updatedAt ?? null,
        ],
      )
      if (!rows[0]) throw new Error('Research thread belongs to another user')

      await client.query('DELETE FROM research_messages WHERE user_id=$1 AND thread_id=$2', [userId, thread.id])
      for (const [index, message] of thread.messages.entries()) {
        await client.query(
          `INSERT INTO research_messages (thread_id,user_id,id,role,content,position)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [thread.id, userId, message.id, message.role, message.content, index],
        )
      }
      await client.query('COMMIT')
      return { ...rows[0], messages: thread.messages }
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  },

  async deleteThread(userId: string, id: string) {
    await pool.query('DELETE FROM research_threads WHERE user_id=$1 AND id=$2', [userId, id])
  },
}
