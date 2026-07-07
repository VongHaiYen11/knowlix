import type { RequestHandler } from 'express'
import { env } from '../../config/env.js'
import { UnauthorizedError } from '../../errors/index.js'
import { verifySessionToken } from '../../lib/jwt.js'
import { authService } from './auth.service.js'

export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const token = req.cookies?.[env.cookieName] || (req.query.token as string | undefined)
    if (!token) throw new UnauthorizedError()
    const payload = verifySessionToken(token)
    const user = await authService.findUserById(payload.sub)
    if (!user) throw new UnauthorizedError()
    ;(req as any).user = user
    next()
  } catch (error) {
    next(error)
  }
}
