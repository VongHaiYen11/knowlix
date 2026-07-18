import { Router } from 'express'
import { asyncRoute } from '../../middleware/async.middleware.js'
import { validateBody } from '../../middleware/validate.middleware.js'
import { requireAuth } from '../auth/auth.middleware.js'
import { researchController } from './research.controller.js'
import { researchSchema, researchThreadSchema } from './research.schemas.js'

export const researchRouter = Router()

researchRouter.use(requireAuth)
researchRouter.get('/threads', asyncRoute(researchController.threads as any))
researchRouter.post('/threads', validateBody(researchThreadSchema), asyncRoute(researchController.saveThread as any))
researchRouter.patch('/threads/:id', validateBody(researchThreadSchema), asyncRoute(researchController.saveThread as any))
researchRouter.post('/threads/:id/summary', asyncRoute(researchController.summarizeThread as any))
researchRouter.delete('/threads/:id', asyncRoute(researchController.deleteThread as any))
researchRouter.post('/messages', validateBody(researchSchema), asyncRoute(researchController.message as any))
