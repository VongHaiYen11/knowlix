import type { Response } from 'express'
import { AppError } from '../../errors/index.js'
import type { AuthedRequest } from '../../types/request.js'
import { isAllowedUploadFile } from './sources.upload.js'
import { sourcesService } from './sources.service.js'

export const sourcesController = {
  async list(req: AuthedRequest, res: Response) {
    res.json(await sourcesService.list(req.user.id, req.query))
  },
  async create(req: AuthedRequest, res: Response) {
    res.status(201).json(await sourcesService.create(req.user.id, req.body))
  },
  async get(req: AuthedRequest, res: Response) {
    res.json(await sourcesService.get(req.user.id, req.params.id))
  },
  async upload(req: AuthedRequest, res: Response) {
    if (!req.file) throw new AppError(400, 'VALIDATION_ERROR', 'file is required')
    if (!isAllowedUploadFile(req.file)) throw new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Unsupported file type. Upload PDF, DOCX, TXT, or Markdown files only.')
    res.status(201).json(await sourcesService.upload(req.user.id, req.file))
  },
  async file(req: AuthedRequest, res: Response) {
    const file = await sourcesService.file(req.user.id, req.params.id)
    res.setHeader('Content-Type', file.mimeType)
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.name)}"`)
    res.sendFile(file.path)
  },
  async update(req: AuthedRequest, res: Response) {
    res.json(await sourcesService.update(req.user.id, req.params.id, req.body))
  },
  async remove(req: AuthedRequest, res: Response) {
    await sourcesService.delete(req.user.id, req.params.id)
    res.status(204).send()
  },
}
