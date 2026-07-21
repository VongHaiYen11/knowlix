const ignoredQueryTerms = new Set([
  'a', 'an', 'and', 'common', 'for', 'give', 'in', 'list', 'of', 'on', 'please',
  'show', 'some', 'tell', 'the', 'to', 'what', 'which', 'with',
])

export function researchQueryTerms(question: string): string[] {
  const words = question.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []
  return Array.from(new Set(words.filter((word) => word.length > 1 && !ignoredQueryTerms.has(word))))
}

export function researchTsQuery(question: string): string {
  return researchQueryTerms(question).map((word) => `'${word}':*`).join(' | ')
}

export function researchTextMatchScore(content: string, question: string): number {
  const terms = researchQueryTerms(question)
  if (!terms.length) return 0
  const lowerContent = content.toLocaleLowerCase()
  return terms.filter((term) => lowerContent.includes(term)).length / terms.length
}

export function relevantMarkdownSnippet(content: string, question: string, maxLength = 1800): string {
  if (content.length <= maxLength) return content
  const lowerContent = content.toLocaleLowerCase()
  const positions = researchQueryTerms(question)
    .map((term) => lowerContent.indexOf(term))
    .filter((position) => position >= 0)
  const matchPosition = positions.length ? Math.min(...positions) : 0
  const start = Math.max(0, Math.min(matchPosition - Math.floor(maxLength / 3), content.length - maxLength))
  const snippet = content.slice(start, start + maxLength)
  return `${start > 0 ? '…' : ''}${snippet}${start + maxLength < content.length ? '…' : ''}`
}
