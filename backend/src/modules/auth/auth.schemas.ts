import { z } from 'zod'

export const signupSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8),
})

export const loginSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1),
})

export const verifyEmailQuerySchema = z.object({
  token: z.string().trim().min(1),
})

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
})

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(1),
  password: z.string().min(8),
})

export const verifyPasswordSchema = z.object({
  password: z.string().min(1),
})
