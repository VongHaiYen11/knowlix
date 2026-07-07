import { Router } from 'express'
import { asyncRoute } from '../../middleware/async.middleware.js'
import { validateBody } from '../../middleware/validate.middleware.js'
import { requireAuth } from '../auth/auth.middleware.js'
import { researchController } from './research.controller.js'
import { researchSchema } from './research.schemas.js'

export const researchRouter = Router()

researchRouter.use(requireAuth)
researchRouter.post('/messages', validateBody(researchSchema), asyncRoute(researchController.message as any))
