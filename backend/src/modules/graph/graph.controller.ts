import type { Response } from 'express'
import type { AuthedRequest } from '../../types/request.js'
import { graphService } from './graph.service.js'

export const graphController = {
  async list(req: AuthedRequest, res: Response) {
    res.json(await graphService.list(req.user.id, req.query))
  },
}
