import { uniqueCleanStrings } from './text.js'

export function queryList(value: unknown): string[] {
  if (value === undefined) return []
  if (Array.isArray(value)) return uniqueCleanStrings(value.map(String))
  return uniqueCleanStrings(String(value).split(','))
}
