import { ApiError } from './errors.js'

export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export function uniqueCleanStrings(values: string[] = []): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
}

export function parsePagination(query: Record<string, unknown>) {
  const page = Number(query.page ?? 1)
  const pageSize = Number(query.pageSize ?? 10)
  if (!Number.isInteger(page) || page < 1) throw new ApiError(400, 'VALIDATION_ERROR', 'page must be >= 1')
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'pageSize must be between 1 and 100')
  }
  return { page, pageSize, offset: (page - 1) * pageSize }
}

export function queryList(value: unknown): string[] {
  if (value === undefined) return []
  if (Array.isArray(value)) return uniqueCleanStrings(value.map(String))
  return uniqueCleanStrings(String(value).split(','))
}

export function todayLabel(): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date())
}

export function wordCount(content: string): number {
  return content.trim().split(/\s+/).filter(Boolean).length
}

export function excerpt(content: string, size = 180): string {
  return content.replace(/```[\s\S]*?```/g, '').replace(/[#*_>`|[\]-]/g, '').trim().slice(0, size)
}
