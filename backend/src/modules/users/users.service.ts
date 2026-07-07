import bcrypt from 'bcryptjs'
import type { z } from 'zod'
import { AppError, ConflictError, UnauthorizedError } from '../../errors/index.js'
import { initialsFromName } from '../../utils/text.js'
import { authRepository } from '../auth/auth.repository.js'
import type { updateMeSchema } from './users.schemas.js'

type UpdateMeInput = z.infer<typeof updateMeSchema>

export const usersService = {
  async updateMe(userId: string, input: UpdateMeInput) {
    const current = await authRepository.findRecordById(userId)
    if (!current) throw new UnauthorizedError()

    if (input.email && input.email !== current.email) {
      const existing = await authRepository.findByEmail(input.email)
      if (existing && existing.id !== userId) throw new ConflictError('Email is already registered')
    }

    let passwordHash: string | undefined
    if (input.newPassword) {
      const passwordOk = await bcrypt.compare(input.currentPassword ?? '', current.passwordHash)
      if (!passwordOk) throw new AppError(400, 'VALIDATION_ERROR', 'Current password is incorrect')
      passwordHash = await bcrypt.hash(input.newPassword, 12)
    }

    return authRepository.update(userId, {
      name: input.name,
      email: input.email,
      initials: input.name ? initialsFromName(input.name) : undefined,
      passwordHash,
    })
  },
}
