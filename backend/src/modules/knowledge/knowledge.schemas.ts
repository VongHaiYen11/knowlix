import { z } from 'zod'
import { uniqueCleanStrings } from '../../utils/text.js'

const jsonArray = z.array(z.unknown()).default([])
const tagsSchema = z.array(z.string()).default([]).transform(uniqueCleanStrings)

export const knowledgeCreateSchema = z.object({
  title: z.string().trim().min(1),
  overview: z.string().default(''),
  category: z.string().trim().min(1),
  tags: tagsSchema,
  sourceIds: z.array(z.string()).optional(),
  content: z.string().optional(),
})

export const knowledgePatchSchema = z.object({
  slug: z.string().trim().min(1).optional(),
  title: z.string().trim().min(1).optional(),
  content: z.string().optional(),
  overview: z.string().optional(),
  category: z.string().trim().min(1).optional(),
  tags: tagsSchema.optional(),
  readTime: z.string().optional(),
  keyIdeas: z.array(z.string()).optional(),
  explanation: z.array(z.string()).optional(),
  examples: jsonArray.optional(),
  related: jsonArray.optional(),
  references: jsonArray.optional(),
  sources: jsonArray.optional(),
  timeline: jsonArray.optional(),
})
