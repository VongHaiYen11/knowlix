import { z } from 'zod'
import { allowedModelId } from './ai-customization.defaults.js'

export const aiReasoningSchema = z.enum(['auto', 'low', 'balanced', 'high'])

const modelSchema = z.string().trim().refine(allowedModelId, 'Unsupported model')
const nullableTemperatureSchema = z.number().min(0).max(1).nullable()

export const aiCustomizationPatchSchema = z.object({
  ingestModel: modelSchema.optional(),
  researchModel: modelSchema.optional(),
  ingestReasoning: aiReasoningSchema.optional(),
  researchReasoning: aiReasoningSchema.optional(),
  ingestTemperature: nullableTemperatureSchema.optional(),
  researchTemperature: nullableTemperatureSchema.optional(),
  knowledgeDefinition: z.string().trim().max(4000).optional(),
  knowledgeExtractionInstructions: z.string().trim().max(8000).optional(),
  researchAnswerInstructions: z.string().trim().max(8000).optional(),
}).strict()
