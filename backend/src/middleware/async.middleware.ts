import type { NextFunction, Request, RequestHandler, Response } from 'express'

export function asyncRoute(handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next)
  }
}
