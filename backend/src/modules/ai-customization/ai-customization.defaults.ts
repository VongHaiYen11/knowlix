import { env } from '../../config/env.js'

export type AiReasoning = 'auto' | 'low' | 'balanced' | 'high'

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

export const DEFAULT_KNOWLEDGE_DEFINITION = `A Knowledge is a durable, self-contained knowledge page that captures one coherent concept, topic, procedure, decision, or reusable body of information. It is synthesized from one or more sources, organized to be understandable on its own, and designed to evolve as new information becomes available rather than remaining tied to a single uploaded document.

A Knowledge page must be a synthesis, not a reproduction of the source. It should not preserve the source's original wording, sequence, lecture flow, or document structure unless that structure is essential to understanding the topic. The final page should contain enough detail to be useful on its own, but it should be substantially more compact, conceptual, and structured than the original source.`

export const DEFAULT_KNOWLEDGE_EXTRACTION_INSTRUCTIONS = `Extract Knowledge pages only when the source contains durable, reusable information.

Prefer broader, well-organized Knowledge pages over many fragmented pages. If several subtopics belong naturally to the same general topic, combine them into one Knowledge page and organize them as sections within that page. For example, if a source discusses decision trees, including fundamentals, pruning, advantages, limitations, and implementation, create one Knowledge page titled "Decision Tree" rather than separate pages for each subsection.

Create separate Knowledge pages only when the source contains clearly unrelated major topics. For example, if a lecture note contains substantial content about both "Romeo and Juliet" and "Large Language Models", create two separate Knowledge pages.

Extract and retain only durable, reusable information, such as core definitions and concepts, important principles and relationships, meaningful procedures or decision rules, important examples that clarify the concept, and limitations, conditions, or trade-offs.

Remove or heavily compress repeated explanations, introductory or transitional language, classroom narration, conversational remarks, administrative information, long examples that do not add distinct knowledge, duplicated definitions, source-specific wording or formatting, and details that are temporary or only relevant to the uploaded document.

Reorganize the retained information into a clear conceptual structure. Combine overlapping statements, resolve repetition, and rewrite the content in concise, independent language. Do not include every detail merely because it appears in the source; include a detail only when it materially improves the reader's understanding of the Knowledge topic.

Update or expand existing Knowledge whenever new content refines, extends, or overlaps with it, instead of creating duplicate pages. When deciding whether to create one page or multiple pages, prioritize conceptual cohesion rather than the number of headings in the source.`

export const DEFAULT_RESEARCH_ANSWER_INSTRUCTIONS = 'Answer the user directly using the retrieved Knowledge and numbered references. Clearly distinguish supported synthesis from explicitly documented facts. If the available Knowledge is insufficient or conflicting, state that instead of guessing.'

export const modelCatalog = [
  {
    id: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    description: 'Fast default model for daily ingestion and research.',
    supportsThinkingBudget: true,
  },
  {
    id: 'gemini-2.5-pro',
    label: 'Gemini 2.5 Pro',
    description: 'Higher quality model for difficult extraction or research.',
    supportsThinkingBudget: true,
  },
] as const

export const ingestOutputLimits = {
  sourceSummaryBodyMaxWords: 450,
  knowledgePageTargetWords: 900,
  knowledgePageMaxWords: 1400,
  summaryMaxOutputTokens: 2200,
  pagesMaxOutputTokens: 12000,
} as const

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

export function thinkingBudget(reasoning: AiReasoning): number | undefined {
  if (reasoning === 'auto') return -1
  if (reasoning === 'low') return 1024
  if (reasoning === 'balanced') return 4096
  return 8192
}

export function geminiConfig(options: {
  responseMimeType?: string
  responseJsonSchema?: unknown
  reasoning: AiReasoning
  temperature: number | null
  systemInstruction?: string
  maxOutputTokens?: number
}) {
  const config: Record<string, unknown> = {}
  if (options.responseMimeType) config.responseMimeType = options.responseMimeType
  if (options.responseJsonSchema) config.responseJsonSchema = options.responseJsonSchema
  if (options.systemInstruction) config.systemInstruction = options.systemInstruction
  if (options.maxOutputTokens !== undefined) config.maxOutputTokens = options.maxOutputTokens
  if (options.temperature !== null) config.temperature = options.temperature
  const budget = thinkingBudget(options.reasoning)
  if (budget !== undefined) config.thinkingConfig = { thinkingBudget: budget }
  return config
}
