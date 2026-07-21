import { Router } from 'express'
import { asyncRoute } from '../../middleware/async.middleware.js'
import { validateBody, validateQuery } from '../../middleware/validate.middleware.js'
import { authController } from './auth.controller.js'
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
  verifyEmailQuerySchema,
  verifyPasswordSchema,
} from './auth.schemas.js'
import { requireAuth } from './auth.middleware.js'
import { env } from '../../config/env.js'

export const authRouter = Router()

authRouter.post('/signup', validateBody(signupSchema), asyncRoute(authController.signup))
authRouter.get(
  '/verify-email',
  validateQuery(verifyEmailQuerySchema, (_req, res) => {
    res.redirect(`${env.frontendOrigin}/login?error=invalid_token`)
  }),
  asyncRoute(authController.verifyEmail),
)
authRouter.post('/login', validateBody(loginSchema), asyncRoute(authController.login))
authRouter.post('/logout', asyncRoute(authController.logout))
authRouter.post('/forgot-password', validateBody(forgotPasswordSchema), asyncRoute(authController.forgotPassword))
authRouter.post('/reset-password', validateBody(resetPasswordSchema), asyncRoute(authController.resetPassword))
authRouter.post('/verify-password', requireAuth, validateBody(verifyPasswordSchema), asyncRoute(authController.verifyPassword as any))
