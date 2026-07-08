import { createHash, randomUUID } from 'node:crypto'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { env } from '../config/env.js'
import { pool } from '../database/pool.js'
import { AppError, NotFoundError } from '../errors/index.js'

export type StorageObjectKind =
  | 'raw_source'
  | 'extracted_text'
  | 'source_summary'
  | 'knowledge_markdown'
  | 'knowledge_revision'
  | 'note_markdown'
  | 'other'

export interface StoredObject {
  id: string
  userId: string
  bucket: string
  key: string
  url: string
  kind: StorageObjectKind
  mimeType: string
  sizeBytes: number
  checksum: string
  originalName: string
}

let supabaseClient: ReturnType<typeof createClient> | undefined

function supabase() {
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    throw new AppError(500, 'INTERNAL_ERROR', 'Missing Supabase Storage configuration')
  }
  supabaseClient ??= createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return supabaseClient
}

function safeName(value: string) {
  return path.basename(value).replace(/[^a-zA-Z0-9._-]+/g, '-')
}

function objectKey(input: { userId: string; kind: StorageObjectKind; originalName: string }) {
  const date = new Date().toISOString().split('T')[0]
  return `${input.userId}/${input.kind}/${date}/${randomUUID()}-${safeName(input.originalName)}`
}

function rowToObject(row: any): StoredObject {
  return {
    id: row.id,
    userId: row.user_id,
    bucket: row.bucket,
    key: row.object_key,
    url: row.url,
    kind: row.kind,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    checksum: row.checksum,
    originalName: row.original_name,
  }
}

export const storageService = {
  async upload(input: {
    userId: string
    kind: StorageObjectKind
    originalName: string
    body: Buffer | string
    mimeType: string
  }): Promise<StoredObject> {
    const body = Buffer.isBuffer(input.body) ? input.body : Buffer.from(input.body, 'utf8')
    const bucket = env.supabaseStorageBucket
    const key = objectKey({ userId: input.userId, kind: input.kind, originalName: input.originalName })
    const checksum = createHash('sha256').update(body).digest('hex')

    const uploadResult = await supabase().storage.from(bucket).upload(key, body, {
      contentType: input.mimeType,
      upsert: false,
    })
    if (uploadResult.error) throw uploadResult.error

    const publicUrl = supabase().storage.from(bucket).getPublicUrl(key).data.publicUrl ?? ''
    const id = `storage_${randomUUID()}`
    const { rows } = await pool.query(
      `INSERT INTO storage_objects (id,user_id,bucket,object_key,url,kind,mime_type,size_bytes,checksum,original_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [id, input.userId, bucket, key, publicUrl, input.kind, input.mimeType, body.byteLength, checksum, input.originalName],
    )
    return rowToObject(rows[0])
  },

  async find(userId: string, id: string): Promise<StoredObject> {
    const { rows } = await pool.query('SELECT * FROM storage_objects WHERE user_id=$1 AND id=$2', [userId, id])
    if (!rows[0]) throw new NotFoundError('Storage object not found')
    return rowToObject(rows[0])
  },

  async download(input: { userId: string; storageObjectId: string }): Promise<{ object: StoredObject; buffer: Buffer }> {
    const object = await this.find(input.userId, input.storageObjectId)
    const result = await supabase().storage.from(object.bucket).download(object.key)
    if (result.error) throw result.error
    return { object, buffer: Buffer.from(await result.data.arrayBuffer()) }
  },

  async readText(input: { userId: string; storageObjectId: string }): Promise<{ object: StoredObject; text: string }> {
    const { object, buffer } = await this.download(input)
    return { object, text: buffer.toString('utf8') }
  },
}
