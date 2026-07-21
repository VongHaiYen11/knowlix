function normalizeTitle(value: string) {
  return value
    .replace(/^#+\s*/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase()
}

function withoutDuplicateLeadingTitle(content: string, hiddenTitle?: string) {
  if (!hiddenTitle?.trim()) return content
  const match = content.match(/^\s*#\s+(.+?)(?:\n+|$)/)
  if (!match || normalizeTitle(match[1]) !== normalizeTitle(hiddenTitle)) return content
  return content.slice(match[0].length).replace(/^\s+/, '')
}

function normalizeMathDelimiters(content: string) {
  return content
    .replace(/\\\[([\s\S]*?)\\\]/g, (_match, math: string) => `\n\n$$\n${math.trim()}\n$$\n\n`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (match, math: string) => {
      const cleanMath = math.trim()
      return cleanMath ? `$${cleanMath}$` : match
    })
}

/**
 * Adapt equivalent LaTeX delimiters for remark-math while leaving prose and
 * fenced code untouched. Canonical Markdown repair belongs to the backend.
 */
export function prepareMarkdownForPreview(content: string, hiddenTitle?: string) {
  return withoutDuplicateLeadingTitle(content, hiddenTitle)
    .split(/(```[\s\S]*?```)/g)
    .map((part) => part.startsWith('```') ? part : normalizeMathDelimiters(part))
    .join('')
    .replace(/\n{3,}/g, '\n\n')
}
