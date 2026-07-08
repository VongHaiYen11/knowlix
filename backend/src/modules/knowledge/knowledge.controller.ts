import type { Response } from 'express'
import type { AuthedRequest } from '../../types/request.js'
import { knowledgeService } from './knowledge.service.js'

export const knowledgeController = {
  async list(req: AuthedRequest, res: Response) {
    res.json(await knowledgeService.list(req.user.id, req.query))
  },
  async get(req: AuthedRequest, res: Response) {
    res.json(await knowledgeService.get(req.user.id, req.params.slug))
  },
  async content(req: AuthedRequest, res: Response) {
    res.type('text/markdown').send(await knowledgeService.content(req.user.id, req.params.slug))
  },
  async create(req: AuthedRequest, res: Response) {
    res.status(201).json(await knowledgeService.create(req.user.id, req.body))
  },
  async propose(req: AuthedRequest, res: Response) {
    res.json(await knowledgeService.propose(req.user.id, req.params.slug, req.body))
  },
  async update(req: AuthedRequest, res: Response) {
    res.json(await knowledgeService.update(req.user.id, req.params.slug, req.body))
  },
  async remove(req: AuthedRequest, res: Response) {
    await knowledgeService.delete(req.user.id, req.params.slug)
    res.status(204).send()
  },
}
