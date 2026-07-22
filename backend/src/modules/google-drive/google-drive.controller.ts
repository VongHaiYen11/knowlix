import type { Request, Response } from 'express'
import type { AuthedRequest } from '../../types/request.js'
import { googleDriveErrorMessage } from './google-drive.errors.js'
import { googleDriveService } from './google-drive.service.js'

export const googleDriveController = {
  async startOauth(req: AuthedRequest, res: Response) {
    res.json(await googleDriveService.startOauth(req.user.id))
  },
  async callback(req: Request, res: Response) {
    try {
      if (req.query.error) {
        res.redirect(googleDriveService.callbackRedirect('error', 'Google Drive connection was cancelled'))
        return
      }
      await googleDriveService.completeOauth(String(req.query.code), String(req.query.state))
      res.redirect(googleDriveService.callbackRedirect('connected'))
    } catch (error) {
      res.redirect(googleDriveService.callbackRedirect('error', googleDriveErrorMessage(error)))
    }
  },
  async status(req: AuthedRequest, res: Response) {
    res.json(await googleDriveService.status(req.user.id))
  },
  async folders(req: AuthedRequest, res: Response) {
    res.json(await googleDriveService.folders(req.user.id))
  },
  async setFolder(req: AuthedRequest, res: Response) {
    res.json(await googleDriveService.setFolder(req.user.id, req.body.folderId))
  },
  async sync(req: AuthedRequest, res: Response) {
    res.status(202).json(await googleDriveService.syncNow(req.user.id))
  },
  async disconnect(req: AuthedRequest, res: Response) {
    await googleDriveService.disconnect(req.user.id)
    res.status(204).send()
  },
}
