import multer from 'multer'
import { env } from '../../config/env.js'

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxUploadMb * 1024 * 1024 },
})

export const allowedUploadMimeTypes = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'audio/mpeg',
  'audio/wav',
  'text/plain',
  'text/markdown',
  'application/json',
  'text/csv',
  'application/octet-stream',
]
