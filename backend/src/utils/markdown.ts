const JSON_ESCAPED_LATEX_COMMANDS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\f\s*rac/g, '\\frac'],
  [/\u0008\s*ar/g, '\\bar'],
  [/\r\s*ight/g, '\\right'],
  [/\n\s*abla/g, '\\nabla'],
  [/\t\s*heta/g, '\\theta'],
  [/\t\s*imes/g, '\\times'],
  [/\t\s*ext/g, '\\text'],
]

function repairJsonEscapedLatex(content: string): string {
  return content.replace(/\$\$[\s\S]*?\$\$|\$(?!\$)[^$]*\$/g, (math) => (
    JSON_ESCAPED_LATEX_COMMANDS.reduce(
      (markdown, [pattern, replacement]) => markdown.replace(pattern, replacement),
      math,
    )
  ))
}

/**
 * Normalize Markdown returned by a model without rewriting its document
 * structure. The LaTeX repair is a compatibility boundary for JSON escape
 * sequences that are valid JSON (for example, `\f` in `\frac`) but decode to
 * control characters before the Markdown is available to the application.
 */
export function normalizeGeneratedMarkdown(content: string): string {
  return normalizeMarkdownWhitespace(repairJsonEscapedLatex(content))
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
