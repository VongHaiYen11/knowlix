import type { z } from 'zod'
import { getGeminiClient } from '../../config/gemini.js'
import type { researchSchema, researchThreadSchema } from './research.schemas.js'
import { researchRepository } from './research.repository.js'
import { storageService } from '../../lib/storage.js'
import { cosineSimilarity, embedText } from '../../lib/embeddings.js'
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

  async retrievalPreview(userId: string, body: z.infer<typeof researchSchema>) {
    const queryEmbedding = await embedText(body.question).catch(() => [])
    const candidates = await researchRepository.retrieveCandidates(userId, { question: body.question, scope: body.scope, queryEmbedding, limit: 40 })
    return candidates.map((row: any) => {
      const vectorScore = Number(row.vector_score ?? 0)
      return {
      slug: row.slug,
      title: row.title,
      overview: row.overview,
      category: row.category,
      tags: row.tags ?? [],
      workspaceLabels: row.workspace_labels ?? [],
      scoreReason: vectorScore > Number(row.fts_score ?? 0) ? 'vector' : row.fts_score > 0 ? 'fts' : 'metadata',
      score: Math.max(Number(row.fts_score ?? 0), vectorScore),
    }
    }).sort((a, b) => b.score - a.score).slice(0, 12)
  },

  async streamAnswer(userId: string, body: z.infer<typeof researchSchema>, model: string) {
    const queryEmbedding = await embedText(body.question).catch(() => [])
    const knowledge = (await researchRepository.retrieveCandidates(userId, { question: body.question, scope: body.scope, queryEmbedding, limit: 40 }))
      .map((row: any) => ({
        ...row,
        hybrid_score: Math.max(Number(row.fts_score ?? 0), Number(row.vector_score ?? 0)),
      }))
      .sort((a: any, b: any) => b.hybrid_score - a.hybrid_score)
      .slice(0, 12)
    const sourcesMap = new Map<string, { id: string; type: string; title: string }>()
    for (const row of knowledge) {
      const sources = Array.isArray(row.source_list) ? row.source_list : []
      for (const source of sources) {
        if (source?.id) sourcesMap.set(source.id, source)
      }
    }
    const uniqueSources = Array.from(sourcesMap.values())
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
      fullPages.push(`Title: ${row.title}\nSlug: ${row.slug}\nOverview: ${row.overview}\nMarkdown:\n${content}`)
    }
    const context = fullPages.join('\n\n---\n\n')
    const sourcesListStr = uniqueSources.map((source) => `- URL: http://127.0.0.1:5173/library/source/${source.id}, Title: ${source.title}`).join('\n')
    const prompt = getResearchAnswerPrompt(body.question, context, sourcesListStr)

    return getGeminiClient().models.generateContentStream({ model, contents: prompt })
  },
}
