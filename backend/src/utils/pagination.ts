import { AppError } from '../errors/index.js'

export function parsePagination(query: Record<string, unknown>) {
  const page = Number(query.page ?? 1)
  const pageSize = Number(query.pageSize ?? 10)
  if (!Number.isInteger(page) || page < 1) throw new AppError(400, 'VALIDATION_ERROR', 'page must be >= 1')
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw new AppError(400, 'VALIDATION_ERROR', 'pageSize must be between 1 and 100')
  }
  return { page, pageSize, offset: (page - 1) * pageSize }
}
