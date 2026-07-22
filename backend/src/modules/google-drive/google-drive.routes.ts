import { Router } from 'express'
import { asyncRoute } from '../../middleware/async.middleware.js'
import { validateBody, validateQuery } from '../../middleware/validate.middleware.js'
import { requireAuth } from '../auth/auth.middleware.js'
import { googleDriveController } from './google-drive.controller.js'
import { googleDriveCallbackQuerySchema, googleDriveFolderSchema } from './google-drive.schemas.js'

export const googleDriveRouter = Router()

googleDriveRouter.get('/oauth/callback', validateQuery(googleDriveCallbackQuerySchema), asyncRoute(googleDriveController.callback))
googleDriveRouter.use(requireAuth)
googleDriveRouter.post('/oauth/start', asyncRoute(googleDriveController.startOauth as any))
googleDriveRouter.get('/', asyncRoute(googleDriveController.status as any))
googleDriveRouter.get('/folders', asyncRoute(googleDriveController.folders as any))
googleDriveRouter.put('/folder', validateBody(googleDriveFolderSchema), asyncRoute(googleDriveController.setFolder as any))
googleDriveRouter.post('/sync', asyncRoute(googleDriveController.sync as any))
googleDriveRouter.delete('/', asyncRoute(googleDriveController.disconnect as any))
