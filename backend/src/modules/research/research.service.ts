import type { z } from 'zod'
import { getGeminiClient } from '../../config/gemini.js'
import type { researchSchema, researchThreadSchema } from './research.schemas.js'
import { researchRepository } from './research.repository.js'
import { storageService } from '../../lib/storage.js'
import { embedText } from '../../lib/embeddings.js'
import { getResearchSelectionPrompt, getResearchAnswerPrompt } from '../../prompts/index.js'

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
    const queryEmbedding = await embedText(body.question).catch(() => [])
    const knowledge = (await researchRepository.retrieveCandidates(userId, {
      question: body.question,
      scope: { tags: [], categories: [] },
      queryEmbedding,
      limit: 40,
    }))
      .map((row: any) => ({
        ...row,
        hybrid_score: Math.max(Number(row.fts_score ?? 0), Number(row.vector_score ?? 0)),
      }))
      .sort((a: any, b: any) => b.hybrid_score - a.hybrid_score)
      .slice(0, 12)
    const candidateList = knowledge.map((row: any) => `Slug: ${row.slug}\nTitle: ${row.title}\nCategory: ${row.category}\nTags: ${(row.tags ?? []).join(', ')}\nOverview: ${row.overview}`).join('\n\n---\n\n')
    const selectionPrompt = getResearchSelectionPrompt(body.question, candidateList)
    let selectedSlugs = new Set<string>()
    if (knowledge.length) {
      try {
        const selection = await getGeminiClient().models.generateContent({
          model,
          contents: selectionPrompt,
          config: { responseMimeType: 'application/json' }
        })
        const cleanText = selection.text ? selection.text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim() : '[]'
        const parsed = JSON.parse(cleanText)
        if (Array.isArray(parsed)) selectedSlugs = new Set(parsed.filter((slug): slug is string => typeof slug === 'string'))
      } catch (error) {
        console.error('[Research API] Failed to parse selected knowledge slugs:', error)
      }
    }
    const selected = knowledge.filter((row: any) => selectedSlugs.has(row.slug)).slice(0, 6)
    const fallbackSelected = selected.length ? selected : knowledge.slice(0, 4)
    const fullPages: string[] = []
    for (const row of fallbackSelected) {
      const storageObjectId = row.markdown_storage_object_id
      const content = storageObjectId ? (await storageService.readText({ userId, storageObjectId })).text : ''
      fullPages.push(`Knowledge Reference: [${fullPages.length + 1}]\nTitle: ${row.title}\nSlug: ${row.slug}\nOverview: ${row.overview}\nMarkdown:\n${content}`)
    }
    const context = fullPages.join('\n\n---\n\n')
    const references = fallbackSelected.map((row: any, index) => ({
      number: index + 1,
      id: row.slug,
      type: 'Knowledge',
      title: row.title,
      tags: row.tags ?? [],
      categories: row.category ? [row.category] : [],
    }))
    const knowledgeReferencesStr = references.map((reference) => `[${reference.number}] ${reference.title} (${reference.type})`).join('\n')
    const prompt = getResearchAnswerPrompt(body.question, context, knowledgeReferencesStr)

    const stream = await getGeminiClient().models.generateContentStream({ model, contents: prompt })
    return { stream, references }
  },
}
