import { Router } from 'express'
import { asyncRoute } from '../../middleware/async.middleware.js'
import { validateBody } from '../../middleware/validate.middleware.js'
import { requireAuth } from '../auth/auth.middleware.js'
import { knowledgeController } from './knowledge.controller.js'
import { knowledgeCreateSchema, knowledgeMergeApplySchema, knowledgeMergePreviewSchema, knowledgePatchSchema } from './knowledge.schemas.js'

export const knowledgeRouter = Router()

knowledgeRouter.use(requireAuth)
knowledgeRouter.get('/', asyncRoute(knowledgeController.list as any))
knowledgeRouter.post('/merge/preview', validateBody(knowledgeMergePreviewSchema), asyncRoute(knowledgeController.mergePreview as any))
knowledgeRouter.post('/merge/apply', validateBody(knowledgeMergeApplySchema), asyncRoute(knowledgeController.mergeApply as any))
knowledgeRouter.get('/:slug/content', asyncRoute(knowledgeController.content as any))
knowledgeRouter.get('/:slug', asyncRoute(knowledgeController.get as any))
knowledgeRouter.post('/', validateBody(knowledgeCreateSchema), asyncRoute(knowledgeController.create as any))
knowledgeRouter.post('/:slug/proposals', validateBody(knowledgePatchSchema), asyncRoute(knowledgeController.propose as any))
knowledgeRouter.patch('/:slug', validateBody(knowledgePatchSchema), asyncRoute(knowledgeController.update as any))
knowledgeRouter.delete('/:slug', asyncRoute(knowledgeController.remove as any))
