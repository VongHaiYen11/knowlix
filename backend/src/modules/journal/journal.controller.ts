import type { Response } from 'express'
import type { AuthedRequest } from '../../types/request.js'
import { journalService } from './journal.service.js'

export const journalController = {
  async list(req: AuthedRequest, res: Response) {
    res.json(await journalService.list(req.user.id, req.query))
  },
  async appendEntry(req: AuthedRequest, res: Response) {
    res.status(201).json(await journalService.appendEntry(req.user.id, req.params.date, req.body))
  },
  async update(req: AuthedRequest, res: Response) {
    res.json(await journalService.update(req.user.id, req.params.date, req.body))
  },
}
