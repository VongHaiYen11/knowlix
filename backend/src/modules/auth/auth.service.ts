import bcrypt from 'bcryptjs'
import { ConflictError, UnauthorizedError } from '../../errors/index.js'
import { initialsFromName } from '../../utils/text.js'
import { signSessionToken } from '../../lib/jwt.js'
import { authRepository } from './auth.repository.js'
import { sendVerificationEmail } from '../../utils/email.js'
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

  findUserById: authRepository.findById,
}
