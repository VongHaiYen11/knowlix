import type { Response } from 'express'
import type { AuthedRequest } from '../../types/request.js'
import { researchService } from './research.service.js'

export const researchController = {
  async message(req: AuthedRequest, res: Response) {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    try {
      const responseStream = await researchService.streamAnswer(req.user.id, req.body)
      for await (const chunk of responseStream) {
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
