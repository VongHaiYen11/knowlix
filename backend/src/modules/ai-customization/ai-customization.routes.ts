import { Router } from 'express'
import { asyncRoute } from '../../middleware/async.middleware.js'
import { validateBody } from '../../middleware/validate.middleware.js'
import { requireAuth } from '../auth/auth.middleware.js'
import { aiCustomizationController } from './ai-customization.controller.js'
import { aiCustomizationPatchSchema } from './ai-customization.schemas.js'

export const aiCustomizationRouter = Router()

aiCustomizationRouter.use(requireAuth)
aiCustomizationRouter.get('/', asyncRoute(aiCustomizationController.get as any))
aiCustomizationRouter.patch('/', validateBody(aiCustomizationPatchSchema), asyncRoute(aiCustomizationController.patch as any))
aiCustomizationRouter.delete('/', asyncRoute(aiCustomizationController.reset as any))
