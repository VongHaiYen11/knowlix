import { z } from 'zod'

export const journalEntrySchema = z.object({
  time: z.string().trim().min(1),
  kind: z.string().trim().min(1),
  text: z.string().trim().min(1),
})

export const journalPatchSchema = z.object({
  summary: z.string().optional(),
  learnings: z.array(z.string()).optional(),
  connections: z.array(z.string()).optional(),
})
