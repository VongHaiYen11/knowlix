import { Router } from 'express'
import { asyncRoute } from '../../middleware/async.middleware.js'
import { validateBody } from '../../middleware/validate.middleware.js'
import { requireAuth } from '../auth/auth.middleware.js'
import { notesController } from './notes.controller.js'
import { noteCreateSchema, notePatchSchema } from './notes.schemas.js'

export const notesRouter = Router()

notesRouter.use(requireAuth)
notesRouter.get('/', asyncRoute(notesController.list as any))
notesRouter.get('/:id/content', asyncRoute(notesController.content as any))
notesRouter.get('/:id', asyncRoute(notesController.get as any))
notesRouter.post('/', validateBody(noteCreateSchema), asyncRoute(notesController.create as any))
notesRouter.post('/:id/source', asyncRoute(notesController.promoteToSource as any))
notesRouter.patch('/:id', validateBody(notePatchSchema), asyncRoute(notesController.update as any))
notesRouter.delete('/:id', asyncRoute(notesController.remove as any))
