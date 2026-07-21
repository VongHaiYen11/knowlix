export const MARKDOWN_MATH_RULES = String.raw`MARKDOWN OUTPUT AND MATH RULES
- Write normal prose at the beginning of the line. Never indent prose with four spaces or a tab because Markdown will render it as a code block.
- Use fenced code blocks only for actual source code, configuration, or terminal output. Never place explanations, citations, or mathematical prose in a code block.
- Leave one blank line after a display equation, then resume prose at the beginning of the next line with no indentation.
- Output math in syntax supported directly by remark-math and KaTeX.
- Use $...$ for short inline math.
- Use display math for formulas and equations. Put the opening $$ and closing $$ on separate lines, with the formula between them.
- Never use \(...\), \[...\], or a fenced code block as math delimiters.
- Never combine or nest math delimiters. For example, use $x$ rather than $\(x\)$.
- Write valid KaTeX-compatible LaTeX. Do not rely on the application to repair or rewrite math after generation.`

export const JSON_MARKDOWN_MATH_RULES = String.raw`${MARKDOWN_MATH_RULES}
- The Markdown is inside JSON strings. Encode every LaTeX backslash as two backslash characters in the JSON source, for example \\frac. After JSON decoding, the Markdown value must contain exactly one backslash per LaTeX command.`
