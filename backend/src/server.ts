import 'dotenv/config'
import cors from 'cors'
import path from 'node:path'
import express, { type NextFunction, type RequestHandler, type Response } from 'express'
import multer from 'multer'
import { z } from 'zod'
import { pool } from './db/pool.js'
import { ApiError, errorHandler } from './errors.js'
import type { AuthedRequest } from './types.js'
import { excerpt, parsePagination, queryList, slugify, todayLabel, uniqueCleanStrings, wordCount } from './utils.js'
import { ingestRawFile, saveRawUpload } from './wiki/ingest.js'
import type { IngestResult } from './wiki/ingest.js'

const app = express()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: Number(process.env.MAX_UPLOAD_MB ?? 25) * 1024 * 1024 },
})

const sourceTypes = ['Note', 'PDF', 'Article', 'Bookmark', 'Image', 'Voice', 'File'] as const
const statuses = ['Queued', 'Processing', 'Processed'] as const
const binarySourceTypes = new Set(['PDF', 'Image', 'Voice', 'File'])

app.use(cors({ origin: process.env.FRONTEND_ORIGIN ?? true }))
app.use(express.json({ limit: '2mb' }))

const auth: RequestHandler = async (req, _res, next) => {
  const header = req.header('authorization')
  const token = (header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined) || (req.query.token as string | undefined)
  if (token !== (process.env.DEV_AUTH_TOKEN ?? 'dev-token')) {
    return next(new ApiError(401, 'UNAUTHORIZED', 'Missing or invalid bearer token'))
  }

  const { rows } = await pool.query('SELECT id, name, initials FROM app_users WHERE id = $1', ['user_dev'])
  ;(req as AuthedRequest).user = rows[0]
  return next()
}

function asyncRoute(handler: (req: AuthedRequest, res: Response) => Promise<unknown>): RequestHandler {
  return (req, res, next) => {
    handler(req as AuthedRequest, res).catch(next)
  }
}

const jsonArray = z.array(z.unknown()).default([])
const tagsSchema = z.array(z.string()).default([]).transform(uniqueCleanStrings)

const knowledgeCreateSchema = z.object({
  title: z.string().trim().min(1),
  overview: z.string().default(''),
  category: z.string().trim().min(1),
  tags: tagsSchema,
  sourceIds: z.array(z.string()).optional(),
  content: z.string().optional(),
})

const knowledgePatchSchema = z
  .object({
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

const sourceCreateSchema = z.object({
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

const sourcePatchSchema = sourceCreateSchema.partial()
const noteCreateSchema = z.object({ title: z.string().trim().min(1), content: z.string().default(''), tags: tagsSchema.optional() })
const notePatchSchema = z.object({ title: z.string().trim().min(1).optional(), content: z.string().max(250000).optional(), tags: tagsSchema.optional() })
const journalEntrySchema = z.object({ time: z.string().trim().min(1), kind: z.string().trim().min(1), text: z.string().trim().min(1) })
const journalPatchSchema = z.object({ summary: z.string().optional(), learnings: z.array(z.string()).optional(), connections: z.array(z.string()).optional() })
const researchSchema = z.object({
  question: z.string().trim().min(1),
  scope: z.object({ tags: z.array(z.string()).default([]), categories: z.array(z.string()).default([]), dateRange: z.string().optional() }).default({ tags: [], categories: [] }),
})

function knowledgeRow(row: Record<string, unknown>) {
  return {
    slug: row.slug,
    title: row.title,
    content: row.content ?? undefined,
    overview: row.overview,
    category: row.category,
    tags: row.tags,
    created: row.created,
    updated: row.updated,
    readTime: row.read_time,
    keyIdeas: row.key_ideas,
    explanation: row.explanation,
    examples: row.examples,
    related: row.related,
    references: row.reference_list,
    sources: row.source_list,
    timeline: row.timeline,
  }
}

function sourceRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    content: row.content ?? undefined,
    tags: row.tags,
    category: row.category,
    created: row.created,
    status: row.status,
    meta: row.meta,
    excerpt: row.excerpt,
    fileId: row.file_id ?? undefined,
  }
}

function noteRow(row: Record<string, unknown>) {
  return { id: row.id, title: row.title, excerpt: row.excerpt, updated: row.updated, words: row.words, content: row.content }
}

function journalRow(row: Record<string, unknown>) {
  return { date: row.date, weekday: row.weekday, summary: row.summary, entries: row.entries, learnings: row.learnings, connections: row.connections }
}

function sourceTypeFromUpload(mimeType: string, filename: string) {
  const extension = filename.toLowerCase().split('.').pop()
  if (mimeType === 'application/pdf' || extension === 'pdf') return 'PDF'
  if (mimeType.startsWith('image/')) return 'Image'
  if (mimeType.startsWith('audio/')) return 'Voice'
  if (extension === 'md' || extension === 'txt') return 'Note'
  if (extension === 'html' || extension === 'htm') return 'Article'
  return 'File'
}

function readTimeFromContent(content: string) {
  const minutes = Math.max(1, Math.ceil(wordCount(content) / 220))
  return `${minutes} min read`
}

function graphPosition(slug: string) {
  let hash = 0
  for (const character of slug) hash = (hash * 31 + character.charCodeAt(0)) >>> 0
  return {
    x: Number((((hash % 80) + 10) / 100).toFixed(2)),
    y: Number(((((hash >>> 8) % 80) + 10) / 100).toFixed(2)),
  }
}

async function upsertGraphNode(input: {
  userId: string
  slug: string
  label: string
  category: string
  tags: string[]
}) {
  const position = graphPosition(input.slug)
  await pool.query(
    `INSERT INTO graph_nodes (id,user_id,label,category,tags,x,y)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (user_id, id) DO UPDATE SET label=EXCLUDED.label, category=EXCLUDED.category, tags=EXCLUDED.tags`,
    [input.slug, input.userId, input.label, input.category, input.tags, position.x, position.y],
  )
}

app.get('/health', (_req, res) => res.json({ ok: true }))
app.use('/api/v1', auth)

app.get('/api/v1/me', asyncRoute(async (req, res) => res.json(req.user)))

app.get('/api/v1/knowledge', asyncRoute(async (req, res) => {
  const { page, pageSize, offset } = parsePagination(req.query)
  const tags = queryList(req.query.tags)
  const filters: string[] = ['user_id = $1']
  const params: unknown[] = [req.user.id]
  if (req.query.q) {
    params.push(`%${String(req.query.q)}%`)
    filters.push(`(title ILIKE $${params.length} OR overview ILIKE $${params.length})`)
  }
  if (req.query.category) {
    params.push(String(req.query.category))
    filters.push(`category = $${params.length}`)
  }
  if (tags.length) {
    params.push(tags)
    filters.push(`tags && $${params.length}::text[]`)
  }
  const where = filters.join(' AND ')
  const count = await pool.query(`SELECT count(*)::int AS total FROM knowledge_entries WHERE ${where}`, params)
  const data = await pool.query(`SELECT * FROM knowledge_entries WHERE ${where} ORDER BY updated_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, pageSize, offset])
  res.json({ items: data.rows.map(knowledgeRow), page, pageSize, total: count.rows[0].total })
}))

app.get('/api/v1/knowledge/:slug', asyncRoute(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM knowledge_entries WHERE user_id = $1 AND slug = $2', [req.user.id, req.params.slug])
  if (!rows[0]) throw new ApiError(404, 'NOT_FOUND', 'Knowledge page not found')
  res.json(knowledgeRow(rows[0]))
}))

app.post('/api/v1/knowledge', asyncRoute(async (req, res) => {
  const body = knowledgeCreateSchema.parse(req.body)
  const slug = slugify(body.title)
  if (!slug) throw new ApiError(400, 'VALIDATION_ERROR', 'Title must produce a valid slug')
  const sourceRows = body.sourceIds?.length
    ? await pool.query('SELECT id, type, title FROM sources WHERE user_id = $1 AND id = ANY($2::text[])', [req.user.id, body.sourceIds])
    : { rows: [] }
  const created = todayLabel()
  const result = await pool.query(
    `INSERT INTO knowledge_entries
      (slug, user_id, title, content, overview, category, tags, created, updated, source_list, timeline)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8,$9,$10)
     RETURNING *`,
    [slug, req.user.id, body.title, body.content, body.overview, body.category, body.tags, created, JSON.stringify(sourceRows.rows), JSON.stringify([{ date: created, event: 'Page created' }])],
  ).catch((error) => {
    if (error.code === '23505') throw new ApiError(409, 'CONFLICT', 'Knowledge slug already exists', { slug })
    throw error
  })
  res.status(201).json(knowledgeRow(result.rows[0]))
}))

app.patch('/api/v1/knowledge/:slug', asyncRoute(async (req, res) => {
  const body = knowledgePatchSchema.parse(req.body)
  const nextSlug = body.slug ? slugify(body.slug) : req.params.slug
  const current = await pool.query('SELECT * FROM knowledge_entries WHERE user_id = $1 AND slug = $2', [req.user.id, req.params.slug])
  if (!current.rows[0]) throw new ApiError(404, 'NOT_FOUND', 'Knowledge page not found')
  const merged = { ...knowledgeRow(current.rows[0]), ...body }
  const result = await pool.query(
    `UPDATE knowledge_entries SET slug=$1,title=$2,content=$3,overview=$4,category=$5,tags=$6,updated=$7,read_time=$8,
      key_ideas=$9,explanation=$10,examples=$11,related=$12,reference_list=$13,source_list=$14,timeline=$15,updated_at=now()
     WHERE user_id=$16 AND slug=$17 RETURNING *`,
    [
      nextSlug,
      merged.title,
      merged.content,
      merged.overview,
      merged.category,
      merged.tags,
      'Saved just now',
      merged.readTime,
      JSON.stringify(merged.keyIdeas),
      JSON.stringify(merged.explanation),
      JSON.stringify(merged.examples),
      JSON.stringify(merged.related),
      JSON.stringify(merged.references),
      JSON.stringify(merged.sources),
      JSON.stringify(merged.timeline),
      req.user.id,
      req.params.slug,
    ],
  ).catch((error) => {
    if (error.code === '23505') throw new ApiError(409, 'CONFLICT', 'Knowledge slug already exists', { slug: nextSlug })
    throw error
  })
  res.json(knowledgeRow(result.rows[0]))
}))

app.delete('/api/v1/knowledge/:slug', asyncRoute(async (req, res) => {
  await pool.query('DELETE FROM graph_links WHERE user_id=$1 AND (source=$2 OR target=$2)', [req.user.id, req.params.slug])
  await pool.query('DELETE FROM graph_nodes WHERE user_id=$1 AND id=$2', [req.user.id, req.params.slug])
  await pool.query('DELETE FROM knowledge_entries WHERE user_id=$1 AND slug=$2', [req.user.id, req.params.slug])
  res.status(204).send()
}))

app.get('/api/v1/sources', asyncRoute(async (req, res) => {
  const { page, pageSize, offset } = parsePagination(req.query)
  const filters = ['user_id = $1']
  const params: unknown[] = [req.user.id]
  for (const key of ['type', 'status', 'category'] as const) {
    if (req.query[key]) {
      params.push(String(req.query[key]))
      filters.push(`${key} = $${params.length}`)
    }
  }
  if (req.query.q) {
    params.push(`%${String(req.query.q)}%`)
    filters.push(`(title ILIKE $${params.length} OR excerpt ILIKE $${params.length})`)
  }
  const where = filters.join(' AND ')
  const count = await pool.query(`SELECT count(*)::int AS total FROM sources WHERE ${where}`, params)
  const data = await pool.query(`SELECT * FROM sources WHERE ${where} ORDER BY updated_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, pageSize, offset])
  res.json({ items: data.rows.map(sourceRow), page, pageSize, total: count.rows[0].total })
}))

app.post('/api/v1/sources', asyncRoute(async (req, res) => {
  const body = sourceCreateSchema.parse(req.body)
  if (binarySourceTypes.has(body.type) && !body.fileId) throw new ApiError(400, 'VALIDATION_ERROR', 'fileId is required for binary source types')
  const id = `source_${crypto.randomUUID()}`
  const created = todayLabel()
  const result = await pool.query(
    `INSERT INTO sources (id,user_id,type,title,content,tags,category,created,status,meta,excerpt,file_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [id, req.user.id, body.type, body.title, body.content, body.tags, body.category, created, body.status, body.meta, body.excerpt || excerpt(body.content ?? ''), body.fileId],
  )
  res.status(201).json(sourceRow(result.rows[0]))
}))

app.get('/api/v1/sources/:id', asyncRoute(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM sources WHERE user_id=$1 AND (id=$2 OR file_id=$2)', [req.user.id, req.params.id])
  if (!rows[0]) throw new ApiError(404, 'NOT_FOUND', 'Source not found')
  res.json(sourceRow(rows[0]))
}))

async function runBackgroundIngest(input: {
  userId: string
  fileId: string
  sourceId: string
  rawFilePath: string
  originalName: string
  mimetype: string
  sizeBytes: number
  created: string
  uploadedType: string
}) {
  const { userId, fileId, sourceId, rawFilePath, originalName, mimetype, sizeBytes, created, uploadedType } = input
  try {
    console.log(`[Ingest] 🚀 Bắt đầu ingest file: "${originalName}" (Source ID: ${sourceId})`)
    console.log(`[Ingest] 🤖 Đang gọi Gemini API để xử lý tài liệu...`)

    const ingest = await ingestRawFile(rawFilePath).catch((error: unknown): IngestResult => ({
      sourcePath: rawFilePath,
      written: [],
      pages: [],
      graphLinks: [],
      skipped: error instanceof Error ? error.message : 'Gemini ingest failed',
    }))

    const uploadStatus = ingest.skipped ? 'skipped' : 'completed'
    if (ingest.skipped) {
      console.log(`[Ingest] ⚠️ Gemini ingest bị bỏ qua hoặc thất bại: ${ingest.skipped}`)
    } else {
      console.log(`[Ingest] 📄 Gemini trả về thành công cho "${originalName}". Bắt đầu ghi dữ liệu...`)
    }

    await pool.query(
      'UPDATE uploaded_files SET ingest_status = $1, ingest_outputs = $2 WHERE id = $3',
      [uploadStatus, JSON.stringify(ingest.written), fileId],
    )

    const summary = ingest.summary
    const sourceType = uploadedType
    const sourceTitle = summary?.title ?? originalName
    const sourceCategory = summary?.category ?? 'Uncategorized'
    const sourceTags = uniqueCleanStrings(summary?.tags ?? [])
    const sourceContent = summary?.body
    const sourceExcerpt = summary?.excerpt || excerpt(sourceContent ?? originalName)
    const sourceStatus = ingest.skipped ? 'Queued' : 'Processed'

    await pool.query(
      `UPDATE sources 
       SET type = $1, title = $2, content = $3, tags = $4, category = $5, status = $6, excerpt = $7, updated_at = now()
       WHERE id = $8`,
      [
        sourceType,
        originalName,
        sourceContent,
        sourceTags,
        sourceCategory,
        sourceStatus,
        sourceExcerpt,
        sourceId,
      ],
    )

    const sourceReference = { id: sourceId, type: sourceType, title: originalName }

    for (const page of ingest.pages) {
      const slug = slugify(page.filename.replace(/\.md$/i, '') || page.title)
      if (!slug) continue
      const related = uniqueCleanStrings(page.related).map((item) => ({ slug: slugify(item), title: item })).filter((item) => item.slug)
      const references = [{ label: sourceTitle, source: ingest.sourcePath }]
      const timeline = [{ date: created, event: `Generated from ${sourceTitle}` }]
      
      console.log(`[Ingest] 💾 Đang ghi trang tri thức: "${page.title}" (slug: ${slug})`)
      
      await pool.query(
        `INSERT INTO knowledge_entries
          (slug,user_id,title,content,overview,category,tags,created,updated,read_time,key_ideas,explanation,examples,related,reference_list,source_list,timeline)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         ON CONFLICT (user_id, slug) DO UPDATE SET
          title=EXCLUDED.title,
          content=EXCLUDED.content,
          overview=EXCLUDED.overview,
          category=EXCLUDED.category,
          tags=(SELECT ARRAY(SELECT DISTINCT unnest(knowledge_entries.tags || EXCLUDED.tags))),
          updated=EXCLUDED.updated,
          read_time=EXCLUDED.read_time,
          explanation=EXCLUDED.explanation,
          related=EXCLUDED.related,
          reference_list=EXCLUDED.reference_list,
          source_list=EXCLUDED.source_list,
          timeline=knowledge_entries.timeline || EXCLUDED.timeline,
          updated_at=now()`,
        [
          slug,
          userId,
          page.title,
          page.body,
          excerpt(page.body, 220),
          sourceCategory,
          sourceTags,
          created,
          readTimeFromContent(page.body),
          JSON.stringify([]),
          JSON.stringify(page.body.split(/\n\s*\n/).filter(Boolean).slice(0, 4)),
          JSON.stringify([]),
          JSON.stringify(related),
          JSON.stringify(references),
          JSON.stringify([sourceReference]),
          JSON.stringify(timeline),
        ],
      )

      await upsertGraphNode({ userId, slug, label: page.title, category: sourceCategory, tags: sourceTags })
    }

    for (const page of ingest.pages) {
      const slug = slugify(page.filename.replace(/\.md$/i, '') || page.title)
      for (const related of page.related) {
        const target = slugify(related)
        if (!slug || !target || slug === target) continue
        await upsertGraphNode({ userId, slug: target, label: related, category: sourceCategory, tags: sourceTags })
        await pool.query(
          `INSERT INTO graph_links (user_id,source,target)
           VALUES ($1,$2,$3)
           ON CONFLICT (user_id, source, target) DO NOTHING`,
          [userId, slug, target],
        )
      }
    }

    for (const link of ingest.graphLinks) {
      const source = slugify(link.source)
      const target = slugify(link.target)
      if (!source || !target || source === target) continue
      await upsertGraphNode({ userId, slug: source, label: link.source, category: sourceCategory, tags: sourceTags })
      await upsertGraphNode({ userId, slug: target, label: link.target, category: sourceCategory, tags: sourceTags })
      await pool.query(
        `INSERT INTO graph_links (user_id,source,target)
         VALUES ($1,$2,$3)
         ON CONFLICT (user_id, source, target) DO NOTHING`,
        [userId, source, target],
      )
    }

    console.log(`[Ingest] ✅ Hoàn thành ingest cho "${originalName}" thành công!`)
  } catch (error) {
    console.error(`[Ingest] ❌ Lỗi khi ingest "${originalName}":`, error)
    try {
      await pool.query(
        'UPDATE uploaded_files SET ingest_status = $1 WHERE id = $2',
        ['failed', fileId],
      )
      await pool.query(
        "UPDATE sources SET status = 'Queued', excerpt = $1 WHERE id = $2",
        [`Ingestion failed: ${error instanceof Error ? error.message : 'Gemini ingest failed'}`, sourceId],
      )
    } catch (dbErr) {
      console.error(`[Ingest] Không thể cập nhật trạng thái lỗi vào DB:`, dbErr)
    }
  }
}

app.post('/api/v1/sources/upload', upload.single('file'), asyncRoute(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'VALIDATION_ERROR', 'file is required')
  const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'audio/mpeg', 'audio/wav', 'text/plain', 'text/markdown', 'application/json', 'text/csv', 'application/octet-stream']
  if (!allowed.includes(req.file.mimetype)) throw new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Unsupported file type')
  
  const fileId = `file_${crypto.randomUUID()}`
  const rawFilePath = await saveRawUpload({
    fileId,
    originalName: req.file.originalname,
    buffer: req.file.buffer,
  })

  await pool.query(
    'INSERT INTO uploaded_files (id,user_id,name,mime_type,size_bytes,raw_path,ingest_status,ingest_outputs) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
    [
      fileId,
      req.user.id,
      req.file.originalname,
      req.file.mimetype,
      req.file.size,
      rawFilePath,
      'pending',
      '[]',
    ],
  )

  const sourceId = `source_${crypto.randomUUID()}`
  const created = todayLabel()
  const uploadedType = sourceTypeFromUpload(req.file.mimetype, req.file.originalname)
  const sourceTitle = req.file.originalname
  const sourceCategory = 'Uncategorized'
  const sourceExcerpt = excerpt(req.file.originalname)

  const sourceInsert = await pool.query(
    `INSERT INTO sources (id,user_id,type,title,content,tags,category,created,status,meta,excerpt,file_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING *`,
    [
      sourceId,
      req.user.id,
      uploadedType,
      sourceTitle,
      null,
      [],
      sourceCategory,
      created,
      'Processing',
      `${req.file.originalname} - ${Math.ceil(req.file.size / 1024)} KB`,
      sourceExcerpt,
      fileId,
    ],
  )

  runBackgroundIngest({
    userId: req.user.id,
    fileId,
    sourceId,
    rawFilePath,
    originalName: req.file.originalname,
    mimetype: req.file.mimetype,
    sizeBytes: req.file.size,
    created,
    uploadedType,
  }).catch((err) => {
    console.error('[Ingest] Unhandled background ingest rejection:', err)
  })

  res.status(201).json({
    fileId,
    name: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    rawPath: rawFilePath,
    ingest: {
      status: 'pending',
      written: [],
      message: undefined,
      source: sourceRow(sourceInsert.rows[0]),
      knowledge: [],
    },
  })
}))

app.get('/api/v1/files/:id', asyncRoute(async (req, res) => {
  const { rows } = await pool.query('SELECT raw_path, mime_type, name FROM uploaded_files WHERE user_id=$1 AND id=$2', [req.user.id, req.params.id])
  if (!rows[0] || !rows[0].raw_path) throw new ApiError(404, 'NOT_FOUND', 'File not found')
  
  const filePath = path.resolve(rows[0].raw_path)
  res.setHeader('Content-Type', rows[0].mime_type)
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(rows[0].name)}"`)
  res.sendFile(filePath)
}))

app.patch('/api/v1/sources/:id', asyncRoute(async (req, res) => {
  const body = sourcePatchSchema.parse(req.body)
  const current = await pool.query('SELECT * FROM sources WHERE user_id=$1 AND id=$2', [req.user.id, req.params.id])
  if (!current.rows[0]) throw new ApiError(404, 'NOT_FOUND', 'Source not found')
  const next = { ...sourceRow(current.rows[0]), ...body }
  const result = await pool.query(
    `UPDATE sources SET type=$1,title=$2,content=$3,tags=$4,category=$5,status=$6,meta=$7,excerpt=$8,file_id=$9,updated_at=now()
     WHERE user_id=$10 AND id=$11 RETURNING *`,
    [next.type, next.title, next.content, next.tags, next.category, next.status, next.meta, next.excerpt, body.fileId ?? current.rows[0].file_id, req.user.id, req.params.id],
  )
  res.json(sourceRow(result.rows[0]))
}))

app.delete('/api/v1/sources/:id', asyncRoute(async (req, res) => {
  console.log(`[Delete] 🗑️ Bắt đầu xóa source: ${req.params.id}`)
  
  const relatedRes = await pool.query(
    `SELECT slug FROM knowledge_entries 
     WHERE user_id = $1 AND source_list @> $2::jsonb`,
    [req.user.id, JSON.stringify([{ id: req.params.id }])]
  )
  const slugs = relatedRes.rows.map((row: any) => row.slug)
  
  if (slugs.length > 0) {
    console.log(`[Delete] 🗑️ Tìm thấy ${slugs.length} trang tri thức liên quan: ${slugs.join(', ')}. Bắt đầu xóa...`)
    
    await pool.query(
      `DELETE FROM graph_links 
       WHERE user_id = $1 AND (source = ANY($2::text[]) OR target = ANY($2::text[]))`,
      [req.user.id, slugs]
    )
    
    await pool.query(
      `DELETE FROM graph_nodes 
       WHERE user_id = $1 AND id = ANY($2::text[])`,
      [req.user.id, slugs]
    )
    
    await pool.query(
      `DELETE FROM knowledge_entries 
       WHERE user_id = $1 AND slug = ANY($2::text[])`,
      [req.user.id, slugs]
    )

    // Dọn dẹp graph_links kết nối giữa các placeholder nodes không còn liên kết với trang tri thức thật nào
    await pool.query(
      `DELETE FROM graph_links
       WHERE user_id = $1
         AND source NOT IN (SELECT slug FROM knowledge_entries WHERE user_id = $1)
         AND target NOT IN (SELECT slug FROM knowledge_entries WHERE user_id = $1)`,
      [req.user.id]
    )

    // Dọn dẹp graph_nodes (các placeholder nodes) không có trang tri thức thật và không còn bất cứ liên kết nào
    await pool.query(
      `DELETE FROM graph_nodes
       WHERE user_id = $1
         AND id NOT IN (SELECT slug FROM knowledge_entries WHERE user_id = $1)
         AND id NOT IN (
           SELECT DISTINCT source FROM graph_links WHERE user_id = $1
           UNION
           SELECT DISTINCT target FROM graph_links WHERE user_id = $1
         )`,
      [req.user.id]
    )
    
    console.log(`[Delete] ✅ Đã xóa thành công ${slugs.length} trang tri thức và dọn dẹp đồ thị (graph) liên quan.`)
  }
  
  await pool.query('DELETE FROM sources WHERE user_id=$1 AND id=$2', [req.user.id, req.params.id])
  console.log(`[Delete] ✅ Đã xóa nguồn (Source) thành công.`)
  
  res.status(204).send()
}))

app.get('/api/v1/notes', asyncRoute(async (req, res) => {
  const { page, pageSize, offset } = parsePagination(req.query)
  const count = await pool.query('SELECT count(*)::int AS total FROM notes WHERE user_id=$1', [req.user.id])
  const data = await pool.query('SELECT * FROM notes WHERE user_id=$1 ORDER BY updated_at DESC LIMIT $2 OFFSET $3', [req.user.id, pageSize, offset])
  res.json({ items: data.rows.map(noteRow), page, pageSize, total: count.rows[0].total })
}))

app.get('/api/v1/notes/:id', asyncRoute(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM notes WHERE user_id=$1 AND id=$2', [req.user.id, req.params.id])
  if (!rows[0]) throw new ApiError(404, 'NOT_FOUND', 'Note not found')
  res.json(noteRow(rows[0]))
}))

app.post('/api/v1/notes', asyncRoute(async (req, res) => {
  const body = noteCreateSchema.parse(req.body)
  const id = `note_${crypto.randomUUID()}`
  const result = await pool.query(
    'INSERT INTO notes (id,user_id,title,excerpt,updated,words,content,tags) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
    [id, req.user.id, body.title, excerpt(body.content, 120), 'Saved just now', wordCount(body.content), body.content, body.tags ?? []],
  )
  res.status(201).json(noteRow(result.rows[0]))
}))

app.patch('/api/v1/notes/:id', asyncRoute(async (req, res) => {
  const body = notePatchSchema.parse(req.body)
  const current = await pool.query('SELECT * FROM notes WHERE user_id=$1 AND id=$2', [req.user.id, req.params.id])
  if (!current.rows[0]) throw new ApiError(404, 'NOT_FOUND', 'Note not found')
  const content = body.content ?? current.rows[0].content
  const title = body.title ?? content.match(/^#\s+(.+)/m)?.[1] ?? current.rows[0].title
  const result = await pool.query(
    'UPDATE notes SET title=$1,excerpt=$2,updated=$3,words=$4,content=$5,tags=$6,updated_at=now() WHERE user_id=$7 AND id=$8 RETURNING *',
    [title, excerpt(content, 120), 'Saved just now', wordCount(content), content, body.tags ?? current.rows[0].tags, req.user.id, req.params.id],
  )
  res.json(noteRow(result.rows[0]))
}))

app.delete('/api/v1/notes/:id', asyncRoute(async (req, res) => {
  await pool.query('DELETE FROM notes WHERE user_id=$1 AND id=$2', [req.user.id, req.params.id])
  res.status(204).send()
}))

app.get('/api/v1/journal', asyncRoute(async (req, res) => {
  const { page, pageSize, offset } = parsePagination(req.query)
  const params: unknown[] = [req.user.id]
  const filters = ['user_id=$1']
  if (req.query.from) {
    params.push(String(req.query.from))
    filters.push(`date >= $${params.length}`)
  }
  if (req.query.to) {
    params.push(String(req.query.to))
    filters.push(`date <= $${params.length}`)
  }
  const where = filters.join(' AND ')
  const count = await pool.query(`SELECT count(*)::int AS total FROM journal_days WHERE ${where}`, params)
  const data = await pool.query(`SELECT * FROM journal_days WHERE ${where} ORDER BY updated_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, pageSize, offset])
  res.json({ items: data.rows.map(journalRow), page, pageSize, total: count.rows[0].total })
}))

app.post('/api/v1/journal/:date/entries', asyncRoute(async (req, res) => {
  const entry = journalEntrySchema.parse(req.body)
  const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date())
  const result = await pool.query(
    `INSERT INTO journal_days (user_id,date,weekday,entries) VALUES ($1,$2,$3,$4)
     ON CONFLICT (user_id,date) DO UPDATE SET entries = journal_days.entries || EXCLUDED.entries, updated_at=now()
     RETURNING *`,
    [req.user.id, req.params.date, weekday, JSON.stringify([entry])],
  )
  res.status(201).json(journalRow(result.rows[0]))
}))

app.patch('/api/v1/journal/:date', asyncRoute(async (req, res) => {
  const body = journalPatchSchema.parse(req.body)
  const current = await pool.query('SELECT * FROM journal_days WHERE user_id=$1 AND date=$2', [req.user.id, req.params.date])
  const result = await pool.query(
    `INSERT INTO journal_days (user_id,date,summary,learnings,connections)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (user_id,date) DO UPDATE SET summary=$3, learnings=$4, connections=$5, updated_at=now()
     RETURNING *`,
    [
      req.user.id,
      req.params.date,
      body.summary ?? current.rows[0]?.summary ?? '',
      JSON.stringify(body.learnings ?? current.rows[0]?.learnings ?? []),
      JSON.stringify(body.connections ?? current.rows[0]?.connections ?? []),
    ],
  )
  res.json(journalRow(result.rows[0]))
}))

app.get('/api/v1/graph', asyncRoute(async (req, res) => {
  const tags = queryList(req.query.tags)
  const categories = queryList(req.query.categories)
  const params: unknown[] = [req.user.id]
  const filters = ['user_id=$1']
  if (req.query.q) {
    params.push(`%${String(req.query.q)}%`)
    filters.push(`label ILIKE $${params.length}`)
  }
  if (tags.length) {
    params.push(tags)
    filters.push(`tags && $${params.length}::text[]`)
  }
  if (categories.length) {
    params.push(categories)
    filters.push(`category = ANY($${params.length}::text[])`)
  }
  const nodes = await pool.query(`SELECT id,label,category,tags,x,y FROM graph_nodes WHERE ${filters.join(' AND ')}`, params)
  const ids = nodes.rows.map((row) => row.id)
  const links = ids.length
    ? await pool.query('SELECT source,target FROM graph_links WHERE user_id=$1 AND source = ANY($2::text[]) AND target = ANY($2::text[])', [req.user.id, ids])
    : { rows: [] }
  res.json({ nodes: nodes.rows, links: links.rows })
}))

app.post('/api/v1/research/messages', asyncRoute(async (req, res) => {
  const body = researchSchema.parse(req.body)
  const knowledge = await pool.query(
    `SELECT slug,title,overview FROM knowledge_entries
     WHERE user_id=$1
       AND ($2::text[] = '{}' OR tags && $2::text[])
       AND ($3::text[] = '{}' OR category = ANY($3::text[]))
     ORDER BY updated_at DESC LIMIT 8`,
    [req.user.id, uniqueCleanStrings(body.scope.tags), uniqueCleanStrings(body.scope.categories)],
  )
  const evidence = knowledge.rows.map(({ slug, title }) => ({ slug, title }))
  res.json({
    answer: `Grounded synthesis for "${body.question}" based on ${evidence.length} matching knowledge page${evidence.length === 1 ? '' : 's'}.`,
    evidence,
    actions: ['Save as Knowledge', 'Create Note', 'Update Existing', 'Merge with Page'],
  })
}))

app.use((error: unknown, _req: express.Request, _res: Response, next: NextFunction) => {
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    return next(new ApiError(413, 'PAYLOAD_TOO_LARGE', 'Uploaded file is too large'))
  }
  return next(error)
})
app.use(errorHandler)

const port = Number(process.env.PORT ?? 4000)
app.listen(port, () => {
  console.log(`Knowlix API listening on http://127.0.0.1:${port}`)
})
