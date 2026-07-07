import type { z } from 'zod'
import { getGeminiClient } from '../../config/gemini.js'
import type { researchSchema } from './research.schemas.js'
import { researchRepository } from './research.repository.js'

export const researchService = {
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
