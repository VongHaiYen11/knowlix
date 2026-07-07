import type { Response } from 'express'
import type { AuthedRequest } from '../../types/request.js'
import { maintenanceService } from './maintenance.service.js'

export const maintenanceController = {
  async lint(req: AuthedRequest, res: Response) {
    res.json({ report: await maintenanceService.lint(req.user) })
  },
}
