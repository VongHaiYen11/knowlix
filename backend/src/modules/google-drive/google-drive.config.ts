import { env } from '../../config/env.js'
import { AppError } from '../../errors/index.js'

export function googleDriveConfigured() {
  return Boolean(
    env.googleClientId?.trim()
    && env.googleClientSecret?.trim()
    && env.googleTokenEncryptionKey?.trim(),
  )
}

export function requireGoogleDriveConfiguration() {
  if (!googleDriveConfigured()) {
    throw new AppError(503, 'INTERNAL_ERROR', 'Google Drive requires backend OAuth configuration')
  }
}
