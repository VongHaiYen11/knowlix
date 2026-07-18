import { pool } from '../../database/pool.js'
import { uniqueCleanStrings } from '../../utils/text.js'

export interface ResearchThreadInput {
  id: string
  title: string
  messages: Array<{
    id: string
    role: 'user' | 'assistant'
    content: string
    references?: Array<{ number: number; id: string; type: string; title: string; tags?: string[]; categories?: string[] }>
  }>
  scope: { tags: string[]; categories: string[]; dateRange?: string }
  createdAt?: string
  updatedAt?: string
  titleManuallyEdited: boolean
}

function messageRow(message: any) {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    references: Array.isArray(message.reference_list) ? message.reference_list : [],
  }
}

export const researchRepository = {
  async retrieveCandidates(userId: string, input: { question: string; scope: { tags: string[]; categories: string[] }; queryEmbedding: number[]; limit?: number }) {
    const tags = uniqueCleanStrings(input.scope.tags)
    const categories = uniqueCleanStrings(input.scope.categories)
    const limit = input.limit ?? 12
    const embeddingStr = `[${input.queryEmbedding.join(',')}]`
    const { rows } = await pool.query(
      `SELECT slug,title,overview,category,knowledge_tags AS tags,markdown_storage_object_id,
        ts_rank_cd(COALESCE(search_vector, to_tsvector('simple', title || ' ' || overview || ' ' || array_to_string(knowledge_tags, ' '))), plainto_tsquery('simple', $4)) AS fts_score,
        1 - (embedding <=> $6::vector) AS vector_score
       FROM knowledge_entries
       WHERE user_id=$1
         AND ($2::text[] = '{}' OR knowledge_tags && $2::text[])
         AND ($3::text[] = '{}' OR category = ANY($3::text[]))
         AND (
          $4 = ''
          OR COALESCE(search_vector, to_tsvector('simple', title || ' ' || overview || ' ' || array_to_string(knowledge_tags, ' '))) @@ plainto_tsquery('simple', $4)
          OR title ILIKE '%' || $4 || '%'
          OR overview ILIKE '%' || $4 || '%'
          OR embedding <=> $6::vector < 0.3
         )
       ORDER BY GREATEST(
          ts_rank_cd(COALESCE(search_vector, to_tsvector('simple', title || ' ' || overview || ' ' || array_to_string(knowledge_tags, ' '))), plainto_tsquery('simple', $4)),
          1 - (embedding <=> $6::vector)
       ) DESC, updated_at DESC
       LIMIT $5`,
      [userId, tags, categories, input.question.trim(), limit, embeddingStr],
    )
    return rows
  },

  async threads(userId: string) {
    const threadResult = await pool.query(
      `SELECT id,title,scope,title_manually_edited,summary_markdown,summary_generated_at,summary_model,summary_message_count,created_at,updated_at
       FROM research_threads
       WHERE user_id=$1
       ORDER BY updated_at DESC`,
      [userId],
    )
    const ids = threadResult.rows.map((row) => row.id)
    const messageResult = ids.length
      ? await pool.query(
        `SELECT thread_id,id,role,content,reference_list
         FROM research_messages
         WHERE user_id=$1 AND thread_id = ANY($2::text[])
         ORDER BY thread_id, position ASC, created_at ASC`,
        [userId, ids],
      )
      : { rows: [] }
    const messagesByThread = new Map<string, any[]>()
    for (const message of messageResult.rows) {
      const current = messagesByThread.get(message.thread_id) ?? []
      current.push(messageRow(message))
      messagesByThread.set(message.thread_id, current)
    }
    return threadResult.rows.map((row) => ({
      ...row,
      messages: messagesByThread.get(row.id) ?? [],
    }))
  },

  async threadWithMessages(userId: string, id: string) {
    const threadResult = await pool.query(
      `SELECT id,title,scope,title_manually_edited,summary_markdown,summary_generated_at,summary_model,summary_message_count,created_at,updated_at
       FROM research_threads
       WHERE user_id=$1 AND id=$2`,
      [userId, id],
    )
    const thread = threadResult.rows[0]
    if (!thread) return undefined
    const messageResult = await pool.query(
      `SELECT thread_id,id,role,content,reference_list
       FROM research_messages
       WHERE user_id=$1 AND thread_id=$2
       ORDER BY position ASC, created_at ASC`,
      [userId, id],
    )
    return {
      ...thread,
      messages: messageResult.rows.map(messageRow),
    }
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
          `INSERT INTO research_messages (thread_id,user_id,id,role,content,reference_list,position)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [thread.id, userId, message.id, message.role, message.content, JSON.stringify(message.references ?? []), index],
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

  async updateSummary(userId: string, id: string, summary: { content: string; model: string; messageCount: number }) {
    const { rows } = await pool.query(
      `UPDATE research_threads
       SET summary_markdown=$1, summary_generated_at=now(), summary_model=$2, summary_message_count=$3, updated_at=now()
       WHERE user_id=$4 AND id=$5
       RETURNING summary_markdown,summary_generated_at,summary_model,summary_message_count`,
      [summary.content, summary.model, summary.messageCount, userId, id],
    )
    return rows[0]
  },
}
