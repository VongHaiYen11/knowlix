import { Router } from 'express'
import { asyncRoute } from '../../middleware/async.middleware.js'
import { validateBody } from '../../middleware/validate.middleware.js'
import { authController } from './auth.controller.js'
import { loginSchema, signupSchema } from './auth.schemas.js'

export const authRouter = Router()

authRouter.post('/signup', validateBody(signupSchema), asyncRoute(authController.signup))
authRouter.get('/verify-email', asyncRoute(authController.verifyEmail))
authRouter.post('/login', validateBody(loginSchema), asyncRoute(authController.login))
authRouter.post('/logout', asyncRoute(authController.logout))
authRouter.post('/forgot-password', asyncRoute(authController.forgotPassword))
authRouter.post('/reset-password', asyncRoute(authController.resetPassword))
