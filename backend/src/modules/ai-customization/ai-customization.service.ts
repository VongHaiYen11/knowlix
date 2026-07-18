import type { z } from 'zod'
import { extractText } from '../../wiki/ingest.js'
import { isAllowedUploadFile } from '../sources/sources.upload.js'
import { AppError } from '../../errors/index.js'
import { aiCustomizationRepository, type AiCustomizationRow } from './ai-customization.repository.js'
import { costEstimateSchema, type aiCustomizationPatchSchema } from './ai-customization.schemas.js'
import { defaultAiCustomization, modelCatalog, modelPrice, pricingCatalog, type AiCustomizationProfile } from './ai-customization.defaults.js'

function numberOrNull(value: string | number | null): number | null {
  if (value === null) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function rowToProfile(row: AiCustomizationRow | null): AiCustomizationProfile {
  const defaults = defaultAiCustomization()
  if (!row) return defaults
  return {
    ingestModel: row.ingest_model || defaults.ingestModel,
    researchModel: row.research_model || defaults.researchModel,
    ingestReasoning: row.ingest_reasoning || defaults.ingestReasoning,
    researchReasoning: row.research_reasoning || defaults.researchReasoning,
    ingestTemperature: numberOrNull(row.ingest_temperature),
    researchTemperature: numberOrNull(row.research_temperature),
    knowledgeDefinition: row.knowledge_definition || defaults.knowledgeDefinition,
    knowledgeExtractionInstructions: row.knowledge_extraction_instructions || defaults.knowledgeExtractionInstructions,
    researchAnswerInstructions: row.research_answer_instructions || defaults.researchAnswerInstructions,
  }
}

function tokenEstimate(text: string) {
  return Math.max(1, Math.ceil(text.length / 4))
}

function outputRange(base: number) {
  return { low: Math.ceil(base * 0.65), base, high: Math.ceil(base * 1.45) }
}

function dollars(inputTokens: number, outputTokens: number, model: string, embeddingTokens = 0) {
  const price = modelPrice(model)
  return (inputTokens / 1_000_000) * price.inputPer1MTokensUsd
    + (outputTokens / 1_000_000) * price.outputPer1MTokensUsd
    + (embeddingTokens / 1_000_000) * pricingCatalog.embedding.inputPer1MTokensUsd
}

function costRange(inputTokens: number, outputs: ReturnType<typeof outputRange>, model: string, embeddingTokens = 0) {
  return {
    lowUsd: Number(dollars(Math.ceil(inputTokens * 0.9), outputs.low, model, embeddingTokens).toFixed(6)),
    baseUsd: Number(dollars(inputTokens, outputs.base, model, embeddingTokens).toFixed(6)),
    highUsd: Number(dollars(Math.ceil(inputTokens * 1.15), outputs.high, model, embeddingTokens).toFixed(6)),
  }
}

export const aiCustomizationService = {
  async effectiveProfile(userId: string) {
    return rowToProfile(await aiCustomizationRepository.find(userId))
  },

  async get(userId: string) {
    const profile = await this.effectiveProfile(userId)
    return {
      profile,
      defaults: defaultAiCustomization(),
      modelCatalog,
      pricingCatalog,
    }
  },

  async patch(userId: string, body: z.infer<typeof aiCustomizationPatchSchema>) {
    const current = await this.effectiveProfile(userId)
    const next = { ...current, ...body }
    await aiCustomizationRepository.upsert(userId, next)
    return this.get(userId)
  },

  async reset(userId: string) {
    await aiCustomizationRepository.delete(userId)
    return this.get(userId)
  },

  async estimateCost(userId: string, body: z.infer<typeof costEstimateSchema>, file?: Express.Multer.File) {
    const profile = await this.effectiveProfile(userId)
    if (body.workflow === 'ingestion') {
      if (!file) throw new AppError(400, 'VALIDATION_ERROR', 'file is required for ingestion estimates')
      if (!isAllowedUploadFile(file)) throw new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Unsupported file type. Upload PDF, DOCX, TXT, or Markdown files only.')
      const extracted = await extractText(file.buffer, file.originalname)
      const sourceTokens = tokenEstimate(extracted.text)
      const inputTokens = sourceTokens * 2 + 1600
      const estimatedOutputTokens = outputRange(Math.max(900, Math.ceil(sourceTokens * 0.22)))
      const estimatedThinkingTokens = outputRange(profile.ingestReasoning === 'high' ? 2500 : profile.ingestReasoning === 'balanced' ? 1200 : profile.ingestReasoning === 'low' ? 500 : 900)
      const embeddingTokens = Math.min(sourceTokens, 1200)
      return {
        workflow: body.workflow,
        model: profile.ingestModel,
        file: { name: file.originalname, kind: extracted.fileKind, sizeBytes: file.size },
        estimatedInputTokens: inputTokens,
        estimatedOutputTokens,
        estimatedThinkingTokens,
        estimatedEmbeddingTokens: embeddingTokens,
        estimatedCost: costRange(inputTokens, estimatedOutputTokens, profile.ingestModel, embeddingTokens),
        disclaimer: pricingCatalog.note,
      }
    }

    const question = body.question?.trim()
    if (!question) throw new AppError(400, 'VALIDATION_ERROR', 'question is required for research estimates')
    const questionTokens = tokenEstimate(question)
    const inputTokens = questionTokens + 8500
    const estimatedOutputTokens = outputRange(900)
    const estimatedThinkingTokens = outputRange(profile.researchReasoning === 'high' ? 2200 : profile.researchReasoning === 'balanced' ? 1000 : profile.researchReasoning === 'low' ? 400 : 800)
    return {
      workflow: body.workflow,
      model: profile.researchModel,
      estimatedInputTokens: inputTokens,
      estimatedOutputTokens,
      estimatedThinkingTokens,
      estimatedEmbeddingTokens: questionTokens,
      estimatedCost: costRange(inputTokens, estimatedOutputTokens, profile.researchModel, questionTokens),
      disclaimer: pricingCatalog.note,
    }
  },
}
