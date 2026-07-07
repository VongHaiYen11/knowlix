import { Router } from 'express'
import { asyncRoute } from '../../middleware/async.middleware.js'
import { validateBody } from '../../middleware/validate.middleware.js'
import { requireAuth } from '../auth/auth.middleware.js'
import { usersController } from './users.controller.js'
import { updateMeSchema } from './users.schemas.js'

export const usersRouter = Router()

usersRouter.get('/me', requireAuth, usersController.me as any)
usersRouter.patch('/me', requireAuth, validateBody(updateMeSchema), asyncRoute(usersController.updateMe as any))
