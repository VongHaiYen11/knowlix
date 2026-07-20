import type { z } from 'zod'
import { AppError, ConflictError, NotFoundError } from '../../errors/index.js'
import { parsePagination } from '../../utils/pagination.js'
import { queryList } from '../../utils/query.js'
import { excerpt, slugify, uniqueCleanStrings } from '../../utils/text.js'
import { todayLabel } from '../../utils/date.js'
import { storageService } from '../../lib/storage.js'
import { embedText } from '../../lib/embeddings.js'
import { env } from '../../config/env.js'
import { getGeminiClient } from '../../config/gemini.js'
import { getKnowledgeMergePrompt } from '../../prompts/index.js'
import { aiCustomizationService } from '../ai-customization/ai-customization.service.js'
import { geminiConfig } from '../ai-customization/ai-customization.defaults.js'
import { knowledgeRow } from './knowledge.mapper.js'
import { knowledgeRepository } from './knowledge.repository.js'
import type { knowledgeCreateSchema, knowledgeMergeApplySchema, knowledgeMergePreviewSchema, knowledgePatchSchema } from './knowledge.schemas.js'

function cleanJsonText(text: string): string {
  return text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
}

function uniqueBy<T>(values: T[], key: (value: T) => string): T[] {
  const seen = new Set<string>()
  const output: T[] = []
  for (const value of values) {
    const id = key(value)
    if (!id || seen.has(id)) continue
    seen.add(id)
    output.push(value)
  }
  return output
}

function jsonArray(value: unknown): any[] {
  return Array.isArray(value) ? value : []
}

function sourceKey(value: any): string {
  return String(value?.id ?? value?.title ?? '').trim()
}

function referenceKey(value: any): string {
  return `${String(value?.label ?? '').trim()}::${String(value?.source ?? '').trim()}`
}

function normalizeRelated(value: unknown): Array<{ slug: string; title: string }> {
  return jsonArray(value)
    .map((item) => ({
      slug: slugify(String(item?.slug ?? item?.title ?? '')),
      title: String(item?.title ?? item?.slug ?? '').trim(),
    }))
    .filter((item) => item.slug && item.title)
}

function firstNonEmpty<T>(primary: T[], fallback: T[]): T[] {
  return primary.length ? primary : fallback
}

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
    const markdown = body.content ?? `# ${body.title}\n\n${body.overview}`
    const markdownObject = await storageService.upload({
      userId,
      kind: 'knowledge_markdown',
      originalName: `${slug}.md`,
      body: markdown,
      mimeType: 'text/markdown',
    })
    const embedding = await embedText(`${body.title}\n${body.overview}\n${body.tags.join(' ')}`)
    try {
      const row = await knowledgeRepository.create({
        userId,
        slug,
        title: body.title,
        overview: body.overview,
        category: body.category,
        tags: body.tags,
        created,
        sources,
        timeline: [{ date: created, event: 'Page created' }],
        markdownStorageObjectId: markdownObject.id,
        knowledgeTags: body.tags,
        embedding,
      })
      await knowledgeRepository.createRevision({
        id: `revision_${crypto.randomUUID()}`,
        userId,
        slug,
        storageObjectId: markdownObject.id,
        revisionType: 'manual_import',
        model: '',
        reason: 'Knowledge page created',
      })
      return knowledgeRow(row)
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
    const markdownObject = body.content
      ? await storageService.upload({
        userId,
        kind: 'knowledge_revision',
        originalName: `${nextSlug}.md`,
        body: body.content,
        mimeType: 'text/markdown',
      })
      : undefined
    const embedding = await embedText(`${merged.title}\n${merged.overview}\n${(merged.knowledgeTags ?? merged.tags ?? []).join(' ')}`)
    try {
      const row = await knowledgeRepository.update({
        ...merged,
        userId,
        currentSlug,
        nextSlug,
        markdownStorageObjectId: markdownObject?.id,
        knowledgeTags: merged.knowledgeTags ?? merged.tags,
        embedding,
      })
      if (markdownObject) {
        await knowledgeRepository.createRevision({
          id: `revision_${crypto.randomUUID()}`,
          userId,
          slug: nextSlug,
          storageObjectId: markdownObject.id,
          revisionType: 'proposal',
          model: env.geminiModel,
          reason: 'User-proposed Knowledge change accepted',
        })
      }
      return knowledgeRow(row)
    } catch (error: any) {
      if (error.code === '23505') throw new ConflictError('Knowledge slug already exists', { slug: nextSlug })
      throw error
    }
  },

  async content(userId: string, slug: string) {
    const row = await knowledgeRepository.findBySlug(userId, slug)
    if (!row) throw new NotFoundError('Knowledge page not found')
    if (!row.markdown_storage_object_id) return ''
    const { text } = await storageService.readText({ userId, storageObjectId: row.markdown_storage_object_id })
    return text
  },

  async propose(userId: string, slug: string, body: z.infer<typeof knowledgePatchSchema>) {
    return this.update(userId, slug, body)
  },

  async mergePreview(userId: string, body: z.infer<typeof knowledgeMergePreviewSchema>) {
    const sourceSlugs = uniqueCleanStrings(body.sourceSlugs.map(slugify))
    if (sourceSlugs.length < 2) throw new AppError(400, 'VALIDATION_ERROR', 'Select at least 2 Knowledge pages to merge')
    if (sourceSlugs.length > 8) throw new AppError(400, 'VALIDATION_ERROR', 'Select at most 8 Knowledge pages to merge')

    const rows = await knowledgeRepository.findBySlugs(userId, sourceSlugs)
    if (rows.length !== sourceSlugs.length) throw new NotFoundError('One or more Knowledge pages were not found')

    const rowsBySlug = new Map(rows.map((row) => [row.slug, row]))
    const orderedRows = sourceSlugs.map((slug) => rowsBySlug.get(slug)!)
    const sources = await Promise.all(orderedRows.map(async (row) => {
      const content = row.markdown_storage_object_id
        ? await storageService.readText({ userId, storageObjectId: row.markdown_storage_object_id }).then((result) => result.text).catch(() => '')
        : ''
      return {
        slug: row.slug,
        title: row.title,
        overview: row.overview ?? '',
        category: row.category ?? 'General',
        tags: row.knowledge_tags ?? row.tags ?? [],
        content: content || `# ${row.title}\n\n${row.overview ?? ''}`,
      }
    }))

    const customization = await aiCustomizationService.effectiveProfile(userId)
    const prompt = getKnowledgeMergePrompt({
      mode: body.mode,
      targetTitle: body.targetTitle,
      context: body.context,
      style: body.style ?? 'balanced',
      knowledgeDefinition: customization.knowledgeDefinition,
      knowledgeExtractionInstructions: customization.knowledgeExtractionInstructions,
      sources,
    })
    const response = await getGeminiClient().models.generateContent({
      model: customization.ingestModel,
      contents: prompt.contents,
      config: geminiConfig({
        responseMimeType: 'application/json',
        reasoning: customization.ingestReasoning,
        temperature: customization.ingestTemperature,
        systemInstruction: prompt.systemInstruction,
      }),
    })

    const responseText = response.text ? cleanJsonText(response.text) : ''
    if (!responseText) throw new AppError(502, 'INTERNAL_ERROR', 'Gemini returned an empty merge preview response')

    let parsed: any
    try {
      parsed = JSON.parse(responseText)
    } catch (error) {
      throw new AppError(502, 'INTERNAL_ERROR', `Failed to parse merge preview JSON: ${error instanceof Error ? error.message : 'invalid JSON'}`)
    }

    const fallbackTags = uniqueCleanStrings(orderedRows.flatMap((row) => row.knowledge_tags ?? row.tags ?? []))
    const title = String(parsed.title || body.targetTitle || orderedRows.map((row) => row.title).join(' + ')).trim()
    const slug = slugify(title)
    const sourceRefs = uniqueBy(orderedRows.flatMap((row) => jsonArray(row.source_list)), sourceKey)
    const references = uniqueBy(orderedRows.flatMap((row) => jsonArray(row.reference_list)), referenceKey)
    const created = todayLabel()

    return {
      title,
      slug,
      overview: String(parsed.overview || excerpt(String(parsed.content || ''), 260)).trim(),
      category: String(parsed.category || orderedRows[0]?.category || 'General').trim(),
      tags: uniqueCleanStrings(Array.isArray(parsed.tags) ? parsed.tags.map(String) : fallbackTags),
      content: String(parsed.content || `# ${title}\n\n${orderedRows.map((row) => row.overview).filter(Boolean).join('\n\n')}`).trim(),
      sources: sourceRefs,
      related: normalizeRelated(parsed.related),
      references,
      timeline: [{ date: created, event: `Merged from ${orderedRows.map((row) => row.title).join(', ')}` }],
      reason: String(parsed.reason || 'Merged related Knowledge pages into one broader page.').trim(),
    }
  },

  async mergeApply(userId: string, body: z.infer<typeof knowledgeMergeApplySchema>) {
    const sourceSlugs = uniqueCleanStrings(body.sourceSlugs.map(slugify))
    if (sourceSlugs.length < 2) throw new AppError(400, 'VALIDATION_ERROR', 'Select at least 2 Knowledge pages to merge')
    if (sourceSlugs.length > 8) throw new AppError(400, 'VALIDATION_ERROR', 'Select at most 8 Knowledge pages to merge')

    const rows = await knowledgeRepository.findBySlugs(userId, sourceSlugs)
    if (rows.length !== sourceSlugs.length) throw new NotFoundError('One or more Knowledge pages were not found')

    const rowsBySlug = new Map(rows.map((row) => [row.slug, row]))
    const orderedRows = sourceSlugs.map((slug) => rowsBySlug.get(slug)!)
    const nextSlug = slugify(body.draft.slug || body.draft.title)
    if (!nextSlug) throw new AppError(400, 'VALIDATION_ERROR', 'Merged title must produce a valid slug')

    const conflicting = await knowledgeRepository.findBySlug(userId, nextSlug)
    if (conflicting && !sourceSlugs.includes(conflicting.slug)) {
      throw new ConflictError('Knowledge slug already exists', { slug: nextSlug })
    }

    const fallbackTags = uniqueCleanStrings(orderedRows.flatMap((row) => row.knowledge_tags ?? row.tags ?? []))
    const tags = uniqueCleanStrings(body.draft.tags.length ? body.draft.tags : fallbackTags)
    const sourceRefs = firstNonEmpty(
      uniqueBy(jsonArray(body.draft.sources), sourceKey),
      uniqueBy(orderedRows.flatMap((row) => jsonArray(row.source_list)), sourceKey),
    )
    const references = firstNonEmpty(
      uniqueBy(jsonArray(body.draft.references), referenceKey),
      uniqueBy(orderedRows.flatMap((row) => jsonArray(row.reference_list)), referenceKey),
    )
    const created = todayLabel()
    const timeline = [{ date: created, event: `Merged from ${orderedRows.map((row) => row.title).join(', ')}` }]
    const customization = await aiCustomizationService.effectiveProfile(userId)
    const markdownObject = await storageService.upload({
      userId,
      kind: 'knowledge_markdown',
      originalName: `${nextSlug}.md`,
      body: body.draft.content,
      mimeType: 'text/markdown',
    })
    const embedding = await embedText(`${body.draft.title}\n${body.draft.overview}\n${excerpt(body.draft.content, 900)}\n${tags.join(' ')}`)

    try {
      const merged = await knowledgeRepository.replaceWithMerged({
        userId,
        sourceSlugs,
        slug: nextSlug,
        title: body.draft.title,
        overview: body.draft.overview,
        category: body.draft.category,
        tags,
        created,
        sources: sourceRefs,
        timeline,
        markdownStorageObjectId: markdownObject.id,
        knowledgeTags: tags,
        related: normalizeRelated(body.draft.related),
        references,
        embedding,
        revisionId: `revision_${crypto.randomUUID()}`,
        revisionType: 'merge',
        model: customization.ingestModel || env.geminiModel,
        reason: body.draft.reason || `Merged from ${orderedRows.map((row) => row.title).join(', ')}`,
      })
      return knowledgeRow(merged)
    } catch (error: any) {
      if (error.code === '23505') throw new ConflictError('Knowledge slug already exists', { slug: nextSlug })
      throw error
    }
  },

  delete: knowledgeRepository.delete,
}
