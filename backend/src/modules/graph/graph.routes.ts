import { Router } from 'express'
import { asyncRoute } from '../../middleware/async.middleware.js'
import { requireAuth } from '../auth/auth.middleware.js'
import { graphController } from './graph.controller.js'

export const graphRouter = Router()

graphRouter.use(requireAuth)
graphRouter.get('/', asyncRoute(graphController.list as any))
