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

export function wordCount(content: string): number {
  return content.trim().split(/\s+/).filter(Boolean).length
}

export function excerpt(content: string, size = 180): string {
  return content.replace(/```[\s\S]*?```/g, '').replace(/[#*_>`|[\]-]/g, '').trim().slice(0, size)
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return (parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : parts[0]?.slice(0, 2) || 'U').toUpperCase()
}
