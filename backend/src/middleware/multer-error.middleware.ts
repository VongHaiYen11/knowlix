import multer from 'multer'
import type { NextFunction, Request, Response } from 'express'
import { AppError } from '../errors/index.js'

export function multerErrorMiddleware(error: unknown, _req: Request, _res: Response, next: NextFunction) {
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    return next(new AppError(413, 'PAYLOAD_TOO_LARGE', 'Uploaded file is too large'))
  }
  return next(error)
}
