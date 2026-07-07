import { Router } from 'express'
import { asyncRoute } from '../../middleware/async.middleware.js'
import { validateBody } from '../../middleware/validate.middleware.js'
import { requireAuth } from '../auth/auth.middleware.js'
import { knowledgeController } from './knowledge.controller.js'
import { knowledgeCreateSchema, knowledgePatchSchema } from './knowledge.schemas.js'

export const knowledgeRouter = Router()

knowledgeRouter.use(requireAuth)
knowledgeRouter.get('/', asyncRoute(knowledgeController.list as any))
knowledgeRouter.get('/:slug', asyncRoute(knowledgeController.get as any))
knowledgeRouter.post('/', validateBody(knowledgeCreateSchema), asyncRoute(knowledgeController.create as any))
knowledgeRouter.patch('/:slug', validateBody(knowledgePatchSchema), asyncRoute(knowledgeController.update as any))
knowledgeRouter.delete('/:slug', asyncRoute(knowledgeController.remove as any))
