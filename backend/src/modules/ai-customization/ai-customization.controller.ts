import type { Response } from 'express'
import type { AuthedRequest } from '../../types/request.js'
import { aiCustomizationService } from './ai-customization.service.js'

export const aiCustomizationController = {
  async get(req: AuthedRequest, res: Response) {
    res.json(await aiCustomizationService.get(req.user.id))
  },

  async patch(req: AuthedRequest, res: Response) {
    res.json(await aiCustomizationService.patch(req.user.id, req.body))
  },

  async reset(req: AuthedRequest, res: Response) {
    res.json(await aiCustomizationService.reset(req.user.id))
  },

  async estimateCost(req: AuthedRequest, res: Response) {
    res.json(await aiCustomizationService.estimateCost(req.user.id, req.body, req.file))
  },
}
