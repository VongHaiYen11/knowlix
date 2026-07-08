import type { Response } from 'express'
import { requestedModel } from '../../config/model.js'
import type { AuthedRequest } from '../../types/request.js'
import { researchService } from './research.service.js'

export const researchController = {
  async threads(req: AuthedRequest, res: Response) {
    res.json(await researchService.threads(req.user.id))
  },

  async saveThread(req: AuthedRequest, res: Response) {
    const body = req.params.id ? { ...req.body, id: req.params.id } : req.body
    res.json(await researchService.upsertThread(req.user.id, body))
  },

  async deleteThread(req: AuthedRequest, res: Response) {
    await researchService.deleteThread(req.user.id, req.params.id)
    res.status(204).send()
  },

  async message(req: AuthedRequest, res: Response) {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    try {
      const { stream, references } = await researchService.streamAnswer(req.user.id, req.body, requestedModel(req))
      res.write(`data: ${JSON.stringify({ references })}\n\n`)
      for await (const chunk of stream) {
        const text = chunk.text
        if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`)
      }
      res.write('data: [DONE]\n\n')
    } catch (streamErr) {
      console.error('[Research API] Streaming error:', streamErr)
      const errMsg = streamErr instanceof Error ? streamErr.message : String(streamErr)
      res.write(`data: ${JSON.stringify({ text: `\n\n[Error during streaming: ${errMsg}]` })}\n\n`)
    } finally {
      res.end()
    }
  },
}
