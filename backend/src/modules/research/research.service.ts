import type { z } from 'zod'
import { getGeminiClient } from '../../config/gemini.js'
import { AppError, NotFoundError } from '../../errors/index.js'
import type { researchSchema, researchThreadSchema } from './research.schemas.js'
import { researchRepository } from './research.repository.js'
import { storageService } from '../../lib/storage.js'
import { embedText } from '../../lib/embeddings.js'
import { parseModelJson } from '../../utils/json.js'
import { getResearchSelectionPrompt, getResearchAnswerPrompt, getResearchSummaryPrompt } from '../../prompts/index.js'
import { relevantMarkdownSnippet, researchTextMatchScore } from './research.query.js'
import { aiCustomizationService } from '../ai-customization/ai-customization.service.js'
import { geminiConfig } from '../ai-customization/ai-customization.defaults.js'

function summaryRow(row: any) {
  if (!row.summary_markdown) return undefined
  return {
    content: row.summary_markdown,
    generatedAt: row.summary_generated_at ? new Date(row.summary_generated_at).toISOString() : '',
    model: row.summary_model ?? '',
    messageCount: Number(row.summary_message_count ?? 0),
  }
}

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
    summary: summaryRow(row),
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

  async summarizeThread(userId: string, id: string) {
    const thread = await researchRepository.threadWithMessages(userId, id)
    if (!thread) throw new NotFoundError('Research thread not found')
    if ((thread.messages ?? []).length <= 3) {
      throw new AppError(400, 'VALIDATION_ERROR', 'A conversation needs more than 3 messages before it can be summarized')
    }

    const customization = await aiCustomizationService.effectiveProfile(userId)
    const prompt = getResearchSummaryPrompt({
      title: thread.title,
      messages: thread.messages,
      answerInstructions: customization.researchAnswerInstructions,
    })
    const response = await getGeminiClient().models.generateContent({
      model: customization.researchModel,
      contents: prompt.contents,
      config: geminiConfig({
        reasoning: customization.researchReasoning,
        temperature: customization.researchTemperature,
        systemInstruction: prompt.systemInstruction,
      }),
    })
    const content = response.text?.trim()
    if (!content) throw new AppError(502, 'INTERNAL_ERROR', 'Gemini returned an empty research summary response')
    const row = await researchRepository.updateSummary(userId, id, {
      content,
      model: customization.researchModel,
      messageCount: thread.messages.length,
    })
    return summaryRow(row)
  },

  async streamAnswer(userId: string, body: z.infer<typeof researchSchema>) {
    const customization = await aiCustomizationService.effectiveProfile(userId)
    const queryEmbedding = await embedText(body.question).catch(() => [])
    const rankedKnowledge = (await researchRepository.retrieveCandidates(userId, {
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
    const knowledgeWithContent = await Promise.all(rankedKnowledge.map(async (row: any) => {
      const content = row.markdown_storage_object_id
        ? await storageService.readText({ userId, storageObjectId: row.markdown_storage_object_id }).then((result) => result.text).catch(() => '')
        : ''
      const searchableContent = `${row.title}\n${row.overview}\n${(row.tags ?? []).join(' ')}\n${content}`
      return { ...row, markdown: content, body_score: researchTextMatchScore(searchableContent, body.question) }
    }))
    const knowledge = knowledgeWithContent
      .sort((a: any, b: any) => b.body_score - a.body_score || b.hybrid_score - a.hybrid_score)
      .slice(0, 12)
    const candidateList = knowledge.map((row: any) => `Slug: ${row.slug}\nTitle: ${row.title}\nCategory: ${row.category}\nTags: ${(row.tags ?? []).join(', ')}\nOverview: ${row.overview}\nRelevant Markdown:\n${relevantMarkdownSnippet(row.markdown, body.question)}`).join('\n\n---\n\n')
    const selectionPrompt = getResearchSelectionPrompt(body.question, candidateList)
    let selectedSlugs = new Set<string>()
    if (knowledge.length) {
      try {
        const selection = await getGeminiClient().models.generateContent({
          model: customization.researchModel,
          contents: selectionPrompt.contents,
          config: geminiConfig({ responseMimeType: 'application/json', reasoning: 'low', temperature: 0, systemInstruction: selectionPrompt.systemInstruction })
        })
        const parsed = parseModelJson(selection.text?.trim() || '[]')
        if (Array.isArray(parsed)) selectedSlugs = new Set(parsed.filter((slug): slug is string => typeof slug === 'string'))
      } catch (error) {
        console.error('[Research API] Failed to parse selected knowledge slugs:', error)
      }
    }
    const selected = knowledge.filter((row: any) => selectedSlugs.has(row.slug)).slice(0, 6)
    const fallbackSelected = selected.length ? selected : knowledge.slice(0, 4)
    const fullPages: string[] = []
    for (const row of fallbackSelected) {
      fullPages.push(`Knowledge Reference: [${fullPages.length + 1}]\nTitle: ${row.title}\nSlug: ${row.slug}\nOverview: ${row.overview}\nMarkdown:\n${row.markdown}`)
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
    const prompt = getResearchAnswerPrompt(body.question, context, knowledgeReferencesStr, customization.researchAnswerInstructions)

    const stream = await getGeminiClient().models.generateContentStream({
      model: customization.researchModel,
      contents: prompt.contents,
      config: geminiConfig({ reasoning: customization.researchReasoning, temperature: customization.researchTemperature, systemInstruction: prompt.systemInstruction }),
    })
    return { stream, references }
  },
}
