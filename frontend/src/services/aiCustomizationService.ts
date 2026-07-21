import { apiClient } from '@/repositories/apiClient'

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

export interface AiModelCatalogItem {
  id: string
  label: string
  description: string
  supportsThinkingBudget: boolean
}

export interface AiCustomizationResponse {
  profile: AiCustomizationProfile
  defaults: AiCustomizationProfile
  modelCatalog: AiModelCatalogItem[]
}

export const aiCustomizationService = {
  get: () => apiClient.get<AiCustomizationResponse>('/api/v1/ai-customization'),
  patch: (profile: Partial<AiCustomizationProfile>) => apiClient.patch<AiCustomizationResponse>('/api/v1/ai-customization', profile),
  reset: () => apiClient.delete<AiCustomizationResponse>('/api/v1/ai-customization'),
}
