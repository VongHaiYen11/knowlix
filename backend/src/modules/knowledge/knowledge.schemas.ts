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

const mergeStyleSchema = z.enum(['balanced', 'bullet', 'paragraph', 'course_notes']).default('balanced')

export const knowledgeMergePreviewSchema = z.object({
  sourceSlugs: z.array(z.string().trim().min(1)).min(2).max(8),
  mode: z.enum(['automatic', 'manual']),
  targetTitle: z.string().trim().min(1).max(160).optional(),
  context: z.string().trim().max(4000).optional(),
  style: mergeStyleSchema.optional(),
})

export const knowledgeMergeApplySchema = z.object({
  sourceSlugs: z.array(z.string().trim().min(1)).min(2).max(8),
  draft: z.object({
    title: z.string().trim().min(1).max(160),
    slug: z.string().trim().min(1).max(100).optional(),
    overview: z.string().trim().default(''),
    category: z.string().trim().min(1),
    tags: tagsSchema,
    content: z.string().trim().min(1),
    sources: jsonArray.optional(),
    related: jsonArray.optional(),
    references: jsonArray.optional(),
    timeline: jsonArray.optional(),
    reason: z.string().trim().max(1000).optional(),
  }),
})
