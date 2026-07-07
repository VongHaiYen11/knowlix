import { z } from 'zod'

export const researchSchema = z.object({
  question: z.string().trim().min(1),
  scope: z.object({
    tags: z.array(z.string()).default([]),
    categories: z.array(z.string()).default([]),
    dateRange: z.string().optional(),
  }).default({ tags: [], categories: [] }),
})
