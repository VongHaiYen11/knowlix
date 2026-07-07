import { Router } from 'express'
import { asyncRoute } from '../../middleware/async.middleware.js'
import { requireAuth } from '../auth/auth.middleware.js'
import { maintenanceController } from './maintenance.controller.js'

export const maintenanceRouter = Router()

maintenanceRouter.use(requireAuth)
maintenanceRouter.post('/lint', asyncRoute(maintenanceController.lint as any))
