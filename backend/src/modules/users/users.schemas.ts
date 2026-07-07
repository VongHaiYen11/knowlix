import { z } from 'zod'

export const updateMeSchema = z.object({
  name: z.string().trim().min(1).optional(),
  email: z.string().trim().email().transform((value) => value.toLowerCase()).optional(),
  currentPassword: z.string().min(1).optional(),
  newPassword: z.string().min(8).optional(),
}).refine((value) => value.name || value.email || value.newPassword, {
  message: 'At least one field must be updated',
}).refine((value) => !value.newPassword || value.currentPassword, {
  message: 'currentPassword is required to change password',
  path: ['currentPassword'],
})
