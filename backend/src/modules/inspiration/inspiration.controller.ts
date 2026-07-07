import type { Response } from 'express'
import { requestedModel } from '../../config/model.js'
import type { AuthedRequest } from '../../types/request.js'
import { inspirationService } from './inspiration.service.js'

export const inspirationController = {
  async today(req: AuthedRequest, res: Response) {
    res.json(await inspirationService.today(req.user.id, requestedModel(req)))
  },
}
