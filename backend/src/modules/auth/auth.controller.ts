import type { Request, Response } from 'express'
import { env } from '../../config/env.js'
import { sessionCookieOptions } from '../../config/cookies.js'
import { authService } from './auth.service.js'
import type { AuthedRequest } from '../../types/request.js'

export const authController = {
  async signup(req: Request, res: Response) {
    await authService.signup(req.body)
    res.status(200).json({ ok: true, message: 'Verification email sent' })
  },

  async verifyEmail(req: Request, res: Response) {
    const token = String(req.query.token)

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

  async forgotPassword(req: Request, res: Response) {
    const { email } = req.body
    await authService.forgotPassword(email)
    res.json({ ok: true, message: 'If the email exists, a password reset link has been sent' })
  },

  async resetPassword(req: Request, res: Response) {
    const { token, password } = req.body
    await authService.resetPassword(token, password)
    res.json({ ok: true, message: 'Password reset successful' })
  },

  async verifyPassword(req: AuthedRequest, res: Response) {
    const { password } = req.body
    await authService.verifyPassword(req.user.id, password)
    res.json({ ok: true })
  },
}
