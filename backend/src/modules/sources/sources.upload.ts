import multer from 'multer'
import { env } from '../../config/env.js'

const allowedUploadExtensions = new Set(['.pdf', '.docx', '.txt', '.md', '.markdown'])
const genericUploadMimeTypes = new Set(['', 'application/octet-stream'])

const allowedMimeTypesByExtension: Record<string, Set<string>> = {
  '.pdf': new Set(['application/pdf']),
  '.docx': new Set(['application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  '.txt': new Set(['text/plain']),
  '.md': new Set(['text/markdown', 'text/plain']),
  '.markdown': new Set(['text/markdown', 'text/plain']),
}

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxUploadMb * 1024 * 1024 },
})

export function isAllowedUploadFile(file: Express.Multer.File): boolean {
  const extension = file.originalname.toLowerCase().match(/\.[^.]+$/)?.[0] ?? ''
  if (!allowedUploadExtensions.has(extension)) return false
  const allowedMimeTypes = allowedMimeTypesByExtension[extension]
  return genericUploadMimeTypes.has(file.mimetype) || allowedMimeTypes.has(file.mimetype)
}
