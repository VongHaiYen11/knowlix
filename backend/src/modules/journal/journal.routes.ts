import { Router } from 'express'
import { asyncRoute } from '../../middleware/async.middleware.js'
import { validateBody } from '../../middleware/validate.middleware.js'
import { requireAuth } from '../auth/auth.middleware.js'
import { journalController } from './journal.controller.js'
import { journalEntrySchema } from './journal.schemas.js'

export const journalRouter = Router()

journalRouter.use(requireAuth)
journalRouter.get('/', asyncRoute(journalController.list as any))
journalRouter.post('/:date/entries', validateBody(journalEntrySchema), asyncRoute(journalController.appendEntry as any))
