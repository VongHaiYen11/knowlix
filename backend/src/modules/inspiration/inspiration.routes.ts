import { Router } from 'express'
import { asyncRoute } from '../../middleware/async.middleware.js'
import { requireAuth } from '../auth/auth.middleware.js'
import { inspirationController } from './inspiration.controller.js'

export const inspirationRouter = Router()

inspirationRouter.use(requireAuth)
inspirationRouter.get('/today', asyncRoute(inspirationController.today as any))
