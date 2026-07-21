import type { Request, Response } from 'express'
import { env } from '../../config/env.js'
import { sessionCookieOptions } from '../../config/cookies.js'
import { authService } from './auth.service.js'

export const authController = {
  async signup(req: Request, res: Response) {
    await authService.signup(req.body)
    res.status(200).json({ ok: true, message: 'Verification email sent' })
  },

  async verifyEmail(req: Request, res: Response) {
    const token = req.query.token
    if (typeof token !== 'string') {
      return res.redirect(`${env.frontendOrigin}/login?error=invalid_token`)
    }

    try {
      await authService.verifyEmail(token)
      res.redirect(`${env.frontendOrigin}/login?verified=true`)
    } catch (err: any) {
      const errorType = err?.message === 'expired_token' ? 'expired_token' : 'invalid_token'
      res.redirect(`${env.frontendOrigin}/login?error=${errorType}`)
    }
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
