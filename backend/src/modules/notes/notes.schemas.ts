import { z } from 'zod'
import { uniqueCleanStrings } from '../../utils/text.js'

const tagsSchema = z.array(z.string()).default([]).transform(uniqueCleanStrings)

export const noteCreateSchema = z.object({
  id: z.string().trim().min(1).optional(),
  title: z.string().trim().min(1),
  content: z.string().default(''),
  tags: tagsSchema.optional(),
})

export const notePatchSchema = z.object({
  title: z.string().trim().min(1).optional(),
  content: z.string().max(250000).optional(),
  tags: tagsSchema.optional(),
})
