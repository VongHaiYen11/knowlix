import type { Response } from 'express'
import type { AuthedRequest } from '../../types/request.js'
import { usersService } from './users.service.js'

export const usersController = {
  me(req: AuthedRequest, res: Response) {
    res.json(req.user)
  },
  async updateMe(req: AuthedRequest, res: Response) {
    res.json(await usersService.updateMe(req.user.id, req.body))
  },
}
