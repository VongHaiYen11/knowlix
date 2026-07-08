import type { Response } from 'express'
import type { AuthedRequest } from '../../types/request.js'
import { sourceRow } from '../sources/sources.mapper.js'
import { notesService } from './notes.service.js'

export const notesController = {
  async list(req: AuthedRequest, res: Response) {
    res.json(await notesService.list(req.user.id, req.query))
  },
  async get(req: AuthedRequest, res: Response) {
    res.json(await notesService.get(req.user.id, req.params.id))
  },
  async content(req: AuthedRequest, res: Response) {
    res.type('text/markdown').send(await notesService.content(req.user.id, req.params.id))
  },
  async create(req: AuthedRequest, res: Response) {
    res.status(201).json(await notesService.create(req.user.id, req.body))
  },
  async update(req: AuthedRequest, res: Response) {
    res.json(await notesService.update(req.user.id, req.params.id, req.body))
  },
  async promoteToSource(req: AuthedRequest, res: Response) {
    res.status(201).json(sourceRow(await notesService.promoteToSource(req.user.id, req.params.id)))
  },
  async remove(req: AuthedRequest, res: Response) {
    await notesService.delete(req.user.id, req.params.id)
    res.status(204).send()
  },
}
