export const MARKDOWN_MATH_RULES = String.raw`MARKDOWN MATH RULES
- Output math in syntax supported directly by remark-math and KaTeX.
- Use $...$ for short inline math.
- Use display math for formulas and equations. Put the opening $$ and closing $$ on separate lines, with the formula between them.
- Never use \(...\), \[...\], or a fenced code block as math delimiters.
- Write valid KaTeX-compatible LaTeX. Do not rely on the application to repair or rewrite math after generation.`

export const JSON_MARKDOWN_MATH_RULES = String.raw`${MARKDOWN_MATH_RULES}
- The Markdown is inside JSON strings. Encode every LaTeX backslash as two backslash characters in the JSON source, for example \\frac. After JSON decoding, the Markdown value must contain exactly one backslash per LaTeX command.`
