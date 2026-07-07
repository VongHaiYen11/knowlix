import { Router } from 'express'
import { requireAuth } from '../auth/auth.middleware.js'
import { usersController } from './users.controller.js'

export const usersRouter = Router()

usersRouter.get('/me', requireAuth, usersController.me as any)
