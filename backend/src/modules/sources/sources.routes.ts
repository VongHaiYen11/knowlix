import { Router } from 'express'
import { asyncRoute } from '../../middleware/async.middleware.js'
import { validateBody } from '../../middleware/validate.middleware.js'
import { requireAuth } from '../auth/auth.middleware.js'
import { sourcesController } from './sources.controller.js'
import { sourceCreateSchema, sourcePatchSchema } from './sources.schemas.js'
import { upload } from './sources.upload.js'

export const sourcesRouter = Router()
export const filesRouter = Router()

sourcesRouter.use(requireAuth)
sourcesRouter.get('/', asyncRoute(sourcesController.list as any))
sourcesRouter.post('/', validateBody(sourceCreateSchema), asyncRoute(sourcesController.create as any))
sourcesRouter.post('/upload', upload.single('file'), asyncRoute(sourcesController.upload as any))
sourcesRouter.get('/:id/content', asyncRoute(sourcesController.content as any))
sourcesRouter.get('/:id', asyncRoute(sourcesController.get as any))
sourcesRouter.patch('/:id', validateBody(sourcePatchSchema), asyncRoute(sourcesController.update as any))
sourcesRouter.delete('/:id', asyncRoute(sourcesController.remove as any))

filesRouter.get('/:id', requireAuth, asyncRoute(sourcesController.file as any))
