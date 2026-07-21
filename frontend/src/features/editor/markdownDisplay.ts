const corruptedLatexCommands: ReadonlyArray<readonly [RegExp, string]> = [
  [/\u0007lpha/g, '\\alpha'],
  [/\u0008egin/g, '\\begin'],
  [/\u0008eta/g, '\\beta'],
  [/\u0008ar/g, '\\bar'],
  [/\u000Crac/g, '\\frac'],
  [/\u0009heta/g, '\\theta'],
  [/\u0009imes/g, '\\times'],
  [/\u0009ext/g, '\\text'],
]

function restoreLatexCommands(math: string) {
  const restored = corruptedLatexCommands.reduce(
    (value, [pattern, replacement]) => value.replace(pattern, replacement),
    math,
  )

  return restored.replace(/\\begin\{cases\}([\s\S]*?)\\end\{cases\}/g, (_match, rows: string) => (
    `\\begin{cases}${rows.replace(/ \\ (?=\\?[A-Za-z])/g, String.raw` \\ `)}\\end{cases}`
  ))
}

function prepareMathOutsideCode(content: string) {
  return content
    .replace(/\$\$[\s\S]*?\$\$|\$(?!\$)[^$\n]*\$/g, restoreLatexCommands)
    .replace(/^[ \t]*\$\$([^\n]+?)\$\$[ \t]*$/gm, (_match, math: string) => (
      `\n\n$$\n${math.trim()}\n$$\n\n`
    ))
}

/** Adapts math for the renderer without changing the stored Markdown. */
export function prepareMarkdownForDisplay(content: string) {
  return content
    .split(/(```[\s\S]*?```)/g)
    .map((part) => part.startsWith('```') ? part : prepareMathOutsideCode(part))
    .join('')
}
