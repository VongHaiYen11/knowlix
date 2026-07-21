import { pool } from '../database/pool.js'

export const storageRepository = {
  async create(input: {
    id: string
    userId: string
    bucket: string
    key: string
    url: string
    kind: string
    mimeType: string
    sizeBytes: number
    checksum: string
    originalName: string
  }) {
    const { rows } = await pool.query(
      `INSERT INTO storage_objects (id,user_id,bucket,object_key,url,kind,mime_type,size_bytes,checksum,original_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        input.id,
        input.userId,
        input.bucket,
        input.key,
        input.url,
        input.kind,
        input.mimeType,
        input.sizeBytes,
        input.checksum,
        input.originalName,
      ],
    )
    return rows[0]
  },

  async find(userId: string, id: string) {
    const { rows } = await pool.query('SELECT * FROM storage_objects WHERE user_id=$1 AND id=$2', [userId, id])
    return rows[0]
  },
}

export type StorageRepository = typeof storageRepository
