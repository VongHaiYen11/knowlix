import { z } from 'zod'

export const googleDriveFolderSchema = z.object({
  folderId: z.string().trim().min(1),
})

export const googleDriveCallbackQuerySchema = z.object({
  code: z.string().trim().min(1).optional(),
  state: z.string().trim().min(1),
  error: z.string().trim().min(1).optional(),
}).refine((value) => Boolean(value.code || value.error), {
  message: 'Google OAuth callback must include a code or error',
})
