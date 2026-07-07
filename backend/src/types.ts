import type { Request } from 'express'

export type SourceType = 'Note' | 'PDF' | 'Article' | 'Bookmark' | 'Image' | 'Voice' | 'File'
export type ProcessingStatus = 'Processed' | 'Processing' | 'Queued'

export interface AuthUser {
  id: string
  name: string
  initials: string
}

export interface AuthedRequest extends Request {
  user: AuthUser
}
