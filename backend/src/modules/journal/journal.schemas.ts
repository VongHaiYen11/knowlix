import { z } from 'zod'

export const journalEntrySchema = z.object({
  time: z.string().trim().min(1),
  text: z.string().trim().min(1),
  tags: z.array(z.string()).default([]),
})
