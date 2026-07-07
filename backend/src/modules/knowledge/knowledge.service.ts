import type { z } from 'zod'
import { AppError, ConflictError, NotFoundError } from '../../errors/index.js'
import { parsePagination } from '../../utils/pagination.js'
import { queryList } from '../../utils/query.js'
import { slugify } from '../../utils/text.js'
import { todayLabel } from '../../utils/date.js'
import { knowledgeRow } from './knowledge.mapper.js'
import { knowledgeRepository } from './knowledge.repository.js'
import type { knowledgeCreateSchema, knowledgePatchSchema } from './knowledge.schemas.js'

export const knowledgeService = {
  async list(userId: string, query: Record<string, unknown>) {
    const { page, pageSize, offset } = parsePagination(query)
    const tags = queryList(query.tags)
    const filters: string[] = ['user_id = $1']
    const params: unknown[] = [userId]
    if (query.q) {
      params.push(`%${String(query.q)}%`)
      filters.push(`(title ILIKE $${params.length} OR overview ILIKE $${params.length})`)
    }
    if (query.category) {
      params.push(String(query.category))
      filters.push(`category = $${params.length}`)
    }
    if (tags.length) {
      params.push(tags)
      filters.push(`tags && $${params.length}::text[]`)
    }
    const result = await knowledgeRepository.list({ userId, where: filters.join(' AND '), params, pageSize, offset })
    return { items: result.rows.map(knowledgeRow), page, pageSize, total: result.total }
  },

  async get(userId: string, slug: string) {
    const row = await knowledgeRepository.findBySlug(userId, slug)
    if (!row) throw new NotFoundError('Knowledge page not found')
    return knowledgeRow(row)
  },

  async create(userId: string, body: z.infer<typeof knowledgeCreateSchema>) {
    const slug = slugify(body.title)
    if (!slug) throw new AppError(400, 'VALIDATION_ERROR', 'Title must produce a valid slug')
    const sources = await knowledgeRepository.sourceRefs(userId, body.sourceIds ?? [])
    const created = todayLabel()
    try {
      return knowledgeRow(await knowledgeRepository.create({
        userId,
        slug,
        title: body.title,
        content: body.content,
        overview: body.overview,
        category: body.category,
        tags: body.tags,
        created,
        sources,
        timeline: [{ date: created, event: 'Page created' }],
      }))
    } catch (error: any) {
      if (error.code === '23505') throw new ConflictError('Knowledge slug already exists', { slug })
      throw error
    }
  },

  async update(userId: string, currentSlug: string, body: z.infer<typeof knowledgePatchSchema>) {
    const current = await knowledgeRepository.findBySlug(userId, currentSlug)
    if (!current) throw new NotFoundError('Knowledge page not found')
    const nextSlug = body.slug ? slugify(body.slug) : currentSlug
    const merged = { ...knowledgeRow(current), ...body }
    try {
      return knowledgeRow(await knowledgeRepository.update({ ...merged, userId, currentSlug, nextSlug }))
    } catch (error: any) {
      if (error.code === '23505') throw new ConflictError('Knowledge slug already exists', { slug: nextSlug })
      throw error
    }
  },

  delete: knowledgeRepository.delete,
}
