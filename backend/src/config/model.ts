import type { Request } from 'express'
import { env } from './env.js'

export function requestedModel(req: Request): string {
  const header = req.header('x-knowlix-model')?.trim()
  if (header && /^[a-zA-Z0-9_.:-]+$/.test(header)) return header
  return env.geminiModel
}
