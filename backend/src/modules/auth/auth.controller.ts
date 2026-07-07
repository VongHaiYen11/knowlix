import type { Request, Response } from 'express'
import { env } from '../../config/env.js'
import { sessionCookieOptions } from '../../config/cookies.js'
import { authService } from './auth.service.js'

export const authController = {
  async signup(req: Request, res: Response) {
    const result = await authService.signup(req.body)
    res.cookie(env.cookieName, result.token, sessionCookieOptions)
    res.status(201).json({ user: result.user })
  },

  async login(req: Request, res: Response) {
    const result = await authService.login(req.body)
    res.cookie(env.cookieName, result.token, sessionCookieOptions)
    res.json({ user: result.user })
  },

  async logout(_req: Request, res: Response) {
    res.clearCookie(env.cookieName, { ...sessionCookieOptions, maxAge: undefined })
    res.json({ ok: true })
  },
}
