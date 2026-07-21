export function normalizeGeneratedMarkdown(content: string): string {
  return normalizeMarkdownWhitespace(content)
}

export function normalizeMarkdownWhitespace(content: string): string {
  return content
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim()
}

export function normalizeKnowledgeMarkdown(content: string, title: string): string {
  const markdown = normalizeGeneratedMarkdown(content)
  const cleanTitle = title.trim()
  if (!markdown || !cleanTitle) return markdown

  if (/^#\s+.+(?:\n|$)/.test(markdown)) {
    return markdown.replace(/^#\s+.+(?=\n|$)/, `# ${cleanTitle}`)
  }
  return `# ${cleanTitle}\n\n${markdown}`
}

export function normalizeSummaryMarkdown(content: string, title: string): string {
  const markdown = normalizeGeneratedMarkdown(content)
  if (!markdown) return markdown

  const leadingH1 = markdown.match(/^#\s+(.+?)(?:\n+|$)/)
  if (!leadingH1) return markdown

  if (leadingH1[1].trim().toLocaleLowerCase() === title.trim().toLocaleLowerCase()) {
    return markdown.slice(leadingH1[0].length).trim()
  }
  return markdown.replace(/^#\s+/, '## ')
}
