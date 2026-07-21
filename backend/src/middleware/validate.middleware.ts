import type { Request, RequestHandler, Response } from 'express'
import type { ZodTypeAny } from 'zod'

export function validateBody(schema: ZodTypeAny): RequestHandler {
  return (req, _res, next) => {
    req.body = schema.parse(req.body)
    next()
  }
}

export function validateQuery(
  schema: ZodTypeAny,
  onInvalid?: (req: Request, res: Response) => void,
): RequestHandler {
  return (req, _res, next) => {
    const parsed = schema.safeParse(req.query)
    if (!parsed.success) {
      if (onInvalid) return onInvalid(req, _res)
      return next(parsed.error)
    }
    req.query = parsed.data
    next()
  }
}
