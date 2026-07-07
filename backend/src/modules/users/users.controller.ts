import type { Response } from 'express'
import type { AuthedRequest } from '../../types/request.js'

export const usersController = {
  me(req: AuthedRequest, res: Response) {
    res.json(req.user)
  },
}
