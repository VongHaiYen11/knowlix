import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { env } from '../../config/env.js'
import { AppError } from '../../errors/index.js'

function encryptionKey(): Buffer {
  const configured = env.googleTokenEncryptionKey?.trim()
  if (!configured) throw new AppError(503, 'INTERNAL_ERROR', 'Google Drive token encryption is not configured')
  const key = /^[a-f\d]{64}$/i.test(configured) ? Buffer.from(configured, 'hex') : Buffer.from(configured, 'base64')
  if (key.length !== 32) throw new AppError(503, 'INTERNAL_ERROR', 'GOOGLE_TOKEN_ENCRYPTION_KEY must encode exactly 32 bytes')
  return key
}

export function encryptDriveToken(value: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.')
}

export function decryptDriveToken(value: string): string {
  const [version, iv, tag, encrypted] = value.split('.')
  if (version !== 'v1' || !iv || !tag || !encrypted) throw new AppError(500, 'INTERNAL_ERROR', 'Stored Google Drive token is invalid')
  try {
    const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(iv, 'base64url'))
    decipher.setAuthTag(Buffer.from(tag, 'base64url'))
    return Buffer.concat([decipher.update(Buffer.from(encrypted, 'base64url')), decipher.final()]).toString('utf8')
  } catch {
    throw new AppError(500, 'INTERNAL_ERROR', 'Stored Google Drive token could not be decrypted')
  }
}
