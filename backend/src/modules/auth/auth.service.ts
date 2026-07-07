import bcrypt from 'bcryptjs'
import { ConflictError, UnauthorizedError } from '../../errors/index.js'
import { initialsFromName } from '../../utils/text.js'
import { signSessionToken } from '../../lib/jwt.js'
import { authRepository } from './auth.repository.js'
import type { loginSchema, signupSchema } from './auth.schemas.js'
import type { z } from 'zod'
import type { AuthResult } from './auth.types.js'

type SignupInput = z.infer<typeof signupSchema>
type LoginInput = z.infer<typeof loginSchema>

export const authService = {
  async signup(input: SignupInput): Promise<AuthResult> {
    const existing = await authRepository.findByEmail(input.email)
    if (existing) throw new ConflictError('Email is already registered')

    const user = await authRepository.create({
      id: `user_${crypto.randomUUID()}`,
      email: input.email,
      passwordHash: await bcrypt.hash(input.password, 12),
      name: input.name,
      initials: initialsFromName(input.name),
    })
    return { user, token: signSessionToken(user.id) }
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
