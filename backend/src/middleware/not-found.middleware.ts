import type { RequestHandler } from 'express'
import { NotFoundError } from '../errors/index.js'

export const notFoundMiddleware: RequestHandler = (req, _res, next) => {
  next(new NotFoundError(`Route not found: ${req.method} ${req.path}`))
}
