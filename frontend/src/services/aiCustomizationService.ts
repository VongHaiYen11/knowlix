import { apiClient } from '@/repositories/apiClient'

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

export interface AiModelCatalogItem {
  id: string
  label: string
  description: string
  supportsThinkingBudget: boolean
  pricing: {
    inputPer1MTokensUsd: number
    outputPer1MTokensUsd: number
  }
}

export interface AiCustomizationResponse {
  profile: AiCustomizationProfile
  defaults: AiCustomizationProfile
  modelCatalog: AiModelCatalogItem[]
  pricingCatalog: {
    currency: string
    unit: string
    lastUpdated: string
    note: string
  }
}

export interface CostEstimateResponse {
  workflow: AiWorkflow
  model: string
  file?: {
    name: string
    kind: string
    sizeBytes: number
  }
  estimatedInputTokens: number
  estimatedOutputTokens: { low: number; base: number; high: number }
  estimatedThinkingTokens: { low: number; base: number; high: number }
  estimatedEmbeddingTokens: number
  estimatedCost: { lowUsd: number; baseUsd: number; highUsd: number }
  disclaimer: string
}

export const aiCustomizationService = {
  get: () => apiClient.get<AiCustomizationResponse>('/api/v1/ai-customization'),
  patch: (profile: Partial<AiCustomizationProfile>) => apiClient.patch<AiCustomizationResponse>('/api/v1/ai-customization', profile),
  reset: () => apiClient.delete<AiCustomizationResponse>('/api/v1/ai-customization'),
  estimateIngestion: (file: File) => {
    const form = new FormData()
    form.set('workflow', 'ingestion')
    form.set('file', file)
    return apiClient.postForm<CostEstimateResponse>('/api/v1/ai-customization/estimate-cost', form)
  },
  estimateResearch: (question: string) => apiClient.post<CostEstimateResponse>('/api/v1/ai-customization/estimate-cost', { workflow: 'research', question }),
}
