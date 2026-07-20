import { env } from '../../config/env.js'

export type AiReasoning = 'auto' | 'low' | 'balanced' | 'high'
export type AiWorkflow = 'ingestion' | 'research'

export interface AiCustomizationProfile {
  ingestModel: string
  researchModel: string
  ingestReasoning: AiReasoning
  researchReasoning: AiReasoning
  ingestTemperature: number | null
  researchTemperature: number | null
  knowledgeDefinition: string
  knowledgeExtractionInstructions: string
  researchAnswerInstructions: string
}

export const DEFAULT_KNOWLEDGE_DEFINITION = 'A Knowledge is a durable, self-contained knowledge page that captures one coherent concept, topic, procedure, decision, or reusable body of information. It is synthesized from one or more sources, organized to be understandable on its own, and designed to evolve as new information becomes available rather than remaining tied to a single uploaded document.'

export const DEFAULT_KNOWLEDGE_EXTRACTION_INSTRUCTIONS = 'Extract Knowledge pages only when the source contains durable, reusable information. Prefer fewer comprehensive pages over many fragmented ones. Update or expand existing Knowledge whenever new content refines, extends, or overlaps with it, instead of creating duplicate pages. Do not create Knowledge for temporary information, isolated examples, boilerplate text, duplicated content, or details that have little long-term value.'

export const DEFAULT_RESEARCH_ANSWER_INSTRUCTIONS = 'Answer the user directly using the retrieved Knowledge and numbered references. Clearly distinguish supported synthesis from explicitly documented facts. If the available Knowledge is insufficient or conflicting, state that instead of guessing.'

export const modelCatalog = [
  {
    id: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    description: 'Fast default model for daily ingestion and research.',
    supportsThinkingBudget: true,
    pricing: { inputPer1MTokensUsd: 0.30, outputPer1MTokensUsd: 2.50 },
  },
  {
    id: 'gemini-2.5-pro',
    label: 'Gemini 2.5 Pro',
    description: 'Higher quality model for difficult extraction or research.',
    supportsThinkingBudget: true,
    pricing: { inputPer1MTokensUsd: 1.25, outputPer1MTokensUsd: 10.00 },
  },
] as const

export const pricingCatalog = {
  currency: 'USD',
  unit: 'per 1M tokens',
  lastUpdated: '2026-06-18',
  note: 'Relative estimator only. Real billing can change with current provider pricing, retries, cached tokens, and thinking tokens.',
  models: modelCatalog.map(({ id, pricing }) => ({ id, ...pricing })),
  embedding: { id: 'gemini-embedding-2', inputPer1MTokensUsd: 0.15 },
}

export function defaultAiCustomization(): AiCustomizationProfile {
  const defaultModel = allowedModelId(env.geminiModel) ? env.geminiModel : 'gemini-2.5-flash'
  return {
    ingestModel: defaultModel,
    researchModel: defaultModel,
    ingestReasoning: 'auto',
    researchReasoning: 'auto',
    ingestTemperature: null,
    researchTemperature: null,
    knowledgeDefinition: DEFAULT_KNOWLEDGE_DEFINITION,
    knowledgeExtractionInstructions: DEFAULT_KNOWLEDGE_EXTRACTION_INSTRUCTIONS,
    researchAnswerInstructions: DEFAULT_RESEARCH_ANSWER_INSTRUCTIONS,
  }
}

export function allowedModelId(model: string): boolean {
  return modelCatalog.some((item) => item.id === model)
}

export function modelPrice(model: string) {
  return modelCatalog.find((item) => item.id === model)?.pricing ?? modelCatalog[0].pricing
}

export function thinkingBudget(reasoning: AiReasoning): number | undefined {
  if (reasoning === 'auto') return -1
  if (reasoning === 'low') return 1024
  if (reasoning === 'balanced') return 4096
  return 8192
}

export function geminiConfig(options: { responseMimeType?: string; reasoning: AiReasoning; temperature: number | null; systemInstruction?: string }) {
  const config: Record<string, unknown> = {}
  if (options.responseMimeType) config.responseMimeType = options.responseMimeType
  if (options.systemInstruction) config.systemInstruction = options.systemInstruction
  if (options.temperature !== null) config.temperature = options.temperature
  const budget = thinkingBudget(options.reasoning)
  if (budget !== undefined) config.thinkingConfig = { thinkingBudget: budget }
  return config
}
