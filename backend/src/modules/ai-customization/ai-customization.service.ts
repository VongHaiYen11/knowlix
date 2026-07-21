import type { z } from 'zod'
import { aiCustomizationRepository, type AiCustomizationRow } from './ai-customization.repository.js'
import { type aiCustomizationPatchSchema } from './ai-customization.schemas.js'
import { allowedModelId, defaultAiCustomization, modelCatalog, type AiCustomizationProfile } from './ai-customization.defaults.js'

function numberOrNull(value: string | number | null): number | null {
  if (value === null) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function rowToProfile(row: AiCustomizationRow | null): AiCustomizationProfile {
  const defaults = defaultAiCustomization()
  if (!row) return defaults
  return {
    ingestModel: allowedModelId(row.ingest_model) ? row.ingest_model : defaults.ingestModel,
    researchModel: allowedModelId(row.research_model) ? row.research_model : defaults.researchModel,
    ingestReasoning: row.ingest_reasoning || defaults.ingestReasoning,
    researchReasoning: row.research_reasoning || defaults.researchReasoning,
    ingestTemperature: numberOrNull(row.ingest_temperature),
    researchTemperature: numberOrNull(row.research_temperature),
    knowledgeDefinition: row.knowledge_definition || defaults.knowledgeDefinition,
    knowledgeExtractionInstructions: row.knowledge_extraction_instructions || defaults.knowledgeExtractionInstructions,
    researchAnswerInstructions: row.research_answer_instructions || defaults.researchAnswerInstructions,
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
}
