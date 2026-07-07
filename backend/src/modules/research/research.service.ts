import type { z } from 'zod'
import { getGeminiClient } from '../../config/gemini.js'
import type { researchSchema, researchThreadSchema } from './research.schemas.js'
import { researchRepository } from './research.repository.js'

function threadRow(row: any) {
  return {
    id: row.id,
    title: row.title,
    messages: row.messages,
    scope: {
      tags: row.scope?.tags ?? [],
      categories: row.scope?.categories ?? [],
      dateRange: row.scope?.dateRange ?? 'Anytime',
    },
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    titleManuallyEdited: row.title_manually_edited,
  }
}

export const researchService = {
  async threads(userId: string) {
    const rows = await researchRepository.threads(userId)
    return rows.map(threadRow)
  },

  async upsertThread(userId: string, body: z.infer<typeof researchThreadSchema>) {
    const row = await researchRepository.upsertThread(userId, body)
    return threadRow(row)
  },

  deleteThread: researchRepository.deleteThread,

  async streamAnswer(userId: string, body: z.infer<typeof researchSchema>, model: string) {
    const knowledge = await researchRepository.scopedKnowledge(userId, body.scope)
    const sourcesMap = new Map<string, { id: string; type: string; title: string }>()
    for (const row of knowledge) {
      const sources = Array.isArray(row.source_list) ? row.source_list : []
      for (const source of sources) {
        if (source?.id) sourcesMap.set(source.id, source)
      }
    }
    const uniqueSources = Array.from(sourcesMap.values())
    const context = knowledge.map((row: any) => `Title: ${row.title}\nSlug: ${row.slug}\nOverview: ${row.overview}\nContent: ${row.content || ''}`).join('\n\n---\n\n')
    const sourcesListStr = uniqueSources.map((source) => `- URL: http://127.0.0.1:5173/library/source/${source.id}, Title: ${source.title}`).join('\n')
    const prompt = `You are a helpful research assistant. Answer the user's question based strictly on the provided Context.
If the answer cannot be found in the Context, say so and do not speculate.

Context:
${context || 'No knowledge entries match the selected tags/categories in scope.'}

Available sources for citation (MUST link to them in markdown when citing claims):
${sourcesListStr || 'No source documents available.'}

Rules for Citations:
- When you make a claim based on a source, you MUST cite it using a markdown link to its exact URL from the list of available sources. E.g., "...according to the midterm notes [Midterm Notes](http://127.0.0.1:5173/library/source/file_xxx)..."
- Do not make up any other URLs.
- Always be concise, clear, and highly accurate to the Context.

Question:
${body.question}`

    return getGeminiClient().models.generateContentStream({ model, contents: prompt })
  },
}
