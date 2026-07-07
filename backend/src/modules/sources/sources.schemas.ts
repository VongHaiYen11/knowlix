import { z } from 'zod'
import { uniqueCleanStrings } from '../../utils/text.js'

export const sourceTypes = ['Note', 'PDF', 'Article', 'Bookmark', 'Image', 'Voice', 'File'] as const
export const statuses = ['Queued', 'Processing', 'Processed'] as const
export const binarySourceTypes = new Set(['PDF', 'Image', 'Voice', 'File'])

const tagsSchema = z.array(z.string()).default([]).transform(uniqueCleanStrings)

export const sourceCreateSchema = z.object({
  type: z.enum(sourceTypes),
  title: z.string().trim().min(1),
  tags: tagsSchema,
  category: z.string().default(''),
  content: z.string().optional(),
  fileId: z.string().optional(),
  status: z.enum(statuses).default('Queued'),
  meta: z.string().default(''),
  excerpt: z.string().default(''),
})

export const sourcePatchSchema = sourceCreateSchema.partial()
