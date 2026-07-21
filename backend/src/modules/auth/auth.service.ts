import bcrypt from 'bcryptjs'
import { AppError, ConflictError, UnauthorizedError } from '../../errors/index.js'
import { initialsFromName } from '../../utils/text.js'
import { signSessionToken } from '../../lib/jwt.js'
import { authRepository } from './auth.repository.js'
import { sendVerificationEmail, sendForgotPasswordEmail } from '../../utils/email.js'
import type { loginSchema, signupSchema } from './auth.schemas.js'
import type { z } from 'zod'
import type { AuthResult } from './auth.types.js'

type SignupInput = z.infer<typeof signupSchema>
type LoginInput = z.infer<typeof loginSchema>

export const authService = {
  async signup(input: SignupInput): Promise<void> {
    const existing = await authRepository.findByEmail(input.email)
    if (existing) throw new ConflictError('This email is already in use')

    const token = crypto.randomUUID()
    const passwordHash = await bcrypt.hash(input.password, 12)
    const initials = initialsFromName(input.name)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    await authRepository.deleteVerificationByEmail(input.email)
    await authRepository.createVerification(token, {
      email: input.email,
      passwordHash,
      name: input.name,
      initials,
      expiresAt,
    })

    await sendVerificationEmail(input.email, input.name, token)
  },

  async verifyEmail(token: string): Promise<void> {
    const verification = await authRepository.findVerificationByToken(token)
    if (!verification) {
      throw new Error('invalid_token')
    }

    if (new Date() > new Date(verification.expires_at)) {
      await authRepository.deleteVerificationByToken(token)
      throw new Error('expired_token')
    }

    const existing = await authRepository.findByEmail(verification.email)
    if (existing) {
      await authRepository.deleteVerificationByToken(token)
      return
    }

    await authRepository.create({
      id: `user_${crypto.randomUUID()}`,
      email: verification.email,
      passwordHash: verification.password_hash,
      name: verification.name,
      initials: verification.initials,
    })

    await authRepository.deleteVerificationByToken(token)
  },

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await authRepository.findByEmail(input.email)
    if (!user) throw new UnauthorizedError('Invalid email or password')
    const ok = await bcrypt.compare(input.password, user.passwordHash)
    if (!ok) throw new UnauthorizedError('Invalid email or password')
    const { passwordHash: _passwordHash, ...safeUser } = user
    return { user: safeUser, token: signSessionToken(user.id) }
  },

  async forgotPassword(email: string): Promise<void> {
    const user = await authRepository.findByEmail(email)
    if (!user) {
      return
    }

    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000) // 1 hour

    await authRepository.deleteResetTokenByEmail(email)
    await authRepository.createResetToken(token, email, expiresAt)

    await sendForgotPasswordEmail(email, user.name, token)
  },

  async resetPassword(token: string, password: string): Promise<void> {
    const record = await authRepository.findResetRecordByToken(token)
    if (!record) {
      throw new AppError(400, 'VALIDATION_ERROR', 'The verification link is invalid or has already been used.')
    }

    if (new Date() > new Date(record.expires_at)) {
      await authRepository.deleteResetToken(token)
      throw new AppError(400, 'VALIDATION_ERROR', 'The verification link has expired. Please sign up again.')
    }

    const passwordHash = await bcrypt.hash(password, 12)
    await authRepository.updatePasswordByEmail(record.email, passwordHash)
    await authRepository.deleteResetToken(token)
  },

  async verifyPassword(userId: string, password: string): Promise<void> {
    const user = await authRepository.findRecordById(userId)
    if (!user) throw new UnauthorizedError()
    const passwordOk = await bcrypt.compare(password, user.passwordHash)
    if (!passwordOk) throw new AppError(400, 'VALIDATION_ERROR', 'Incorrect password')
  },

  findUserById: authRepository.findById,
}
