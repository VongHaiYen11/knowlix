import { z } from 'zod'

export const researchScopeSchema = z.object({
  tags: z.array(z.string()).default([]),
  categories: z.array(z.string()).default([]),
  dateRange: z.string().optional(),
})

export const researchMessageSchema = z.object({
  id: z.string().trim().min(1),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
})

export const researchThreadSchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(1).default('Untitled'),
  messages: z.array(researchMessageSchema).default([]),
  scope: researchScopeSchema.default({ tags: [], categories: [], dateRange: 'Anytime' }),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
  titleManuallyEdited: z.boolean().default(false),
})

export const researchSchema = z.object({
  question: z.string().trim().min(1),
  scope: researchScopeSchema.default({ tags: [], categories: [] }),
})
