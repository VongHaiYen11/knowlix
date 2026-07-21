import ReactMarkdown from 'react-markdown'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import { MermaidDiagram } from './MermaidDiagram'

function normalizeTitle(value: string) {
  return value
    .replace(/^#+\s*/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function withoutDuplicateLeadingTitle(content: string, hiddenTitle?: string) {
  if (!hiddenTitle?.trim()) return content
  const match = content.match(/^\s*#\s+(.+?)(?:\n+|$)/)
  if (!match) return content
  if (normalizeTitle(match[1]) !== normalizeTitle(hiddenTitle)) return content
  return content.slice(match[0].length).replace(/^\s+/, '')
}

function repairJsonEscapedLatex(content: string) {
  return content
    .replace(/\u0007\s*lpha/g, '\\alpha')
    .replace(/\f\s*rac/g, '\\frac')
    .replace(/\u0008\s*ar/g, '\\bar')
    .replace(/\u0008\s*eta/g, '\\beta')
    .replace(/\r\s*ight/g, '\\right')
    .replace(/\n\s*abla/g, '\\nabla')
    .replace(/\t\s*heta/g, '\\theta')
    .replace(/\t\s*imes/g, '\\times')
    .replace(/\t\s*ext/g, '\\text')
}

function isFormulaLike(math: string) {
  return /(?:=|\\(?:alpha|beta|gamma|delta|theta|lambda|mu|sigma|partial|frac|sum|prod|int|sqrt|left|right|begin|lim|operatorname|cdot|times)|[<>]=?)/.test(math)
}

function normalizeMathDelimiters(content: string) {
  return content
    .replace(/\\\[([\s\S]*?)\\\]/g, (_match, math: string) => `\n\n$$\n${math.trim()}\n$$\n\n`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (match, math: string) => {
      const cleanMath = math.trim()
      if (!cleanMath) return match
      return `$${cleanMath}$`
    })
}

function repairBareEquationText(content: string) {
  return content
    .replace(/(^|[:：]\s+)([A-Za-z][A-Za-z0-9_{}\\^+\-*/=<>()\s]+(?:\\(?:alpha|beta|gamma|delta|theta|lambda|mu|sigma|partial|frac|sum|prod|int|sqrt)|\blpha\b|frac\{)[^.\n]*?)(?=\s+(?:Where|where|Here|here|with|for)\b|[.。]|$)/g, (_match, prefix: string, math: string) => {
      const trailingExplanation = math.match(/\s+(?:Where|where|Here|here|with|for)\b[\s\S]*$/)
      const equation = trailingExplanation?.index === undefined ? math : math.slice(0, trailingExplanation.index)
      const cleanMath = equation.trim().replace(/\blpha\b/g, '\\alpha')
      const suffix = trailingExplanation ? ` ${trailingExplanation[0].trim().replace(/\blpha\b/g, 'alpha')}` : ''
      return `${prefix}$${cleanMath}$${suffix}`
    })
}

function normalizePreviewMath(content: string) {
  return content
    .split(/(```[\s\S]*?```)/g)
    .map((part) => {
      if (part.startsWith('```')) return part
      return repairBareEquationText(normalizeMathDelimiters(part))
    })
    .join('')
    .replace(/\n{3,}/g, '\n\n')
}

export function MarkdownPreview({ content, hiddenTitle }: { content: string; hiddenTitle?: string }) {
  const previewContent = normalizePreviewMath(repairJsonEscapedLatex(withoutDuplicateLeadingTitle(content, hiddenTitle)))
  return (
    <div className="max-w-none text-foreground [&_.katex-display]:my-6 [&_.katex-display]:overflow-x-auto [&_.katex-display]:text-center">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ children }) => <h1 className="mb-4 mt-8 font-serif text-3xl leading-tight tracking-tight first:mt-0">{children}</h1>,
          h2: ({ children }) => <h2 className="mb-3 mt-8 font-serif text-2xl leading-snug tracking-tight">{children}</h2>,
          h3: ({ children }) => <h3 className="mb-2 mt-6 font-serif text-xl leading-snug tracking-tight">{children}</h3>,
          p: ({ children }) => <p className="my-4 text-[17px] leading-relaxed text-foreground/90">{children}</p>,
          a: ({ children, href }) => <a href={href} className="text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary">{children}</a>,
          li: ({ children }) => <li className="ml-5 list-disc text-[17px] leading-relaxed text-foreground/90">{children}</li>,
          blockquote: ({ children }) => <blockquote className="my-5 border-l-2 border-primary/40 pl-5 font-serif text-lg italic leading-relaxed text-muted-foreground">{children}</blockquote>,
          code: ({ className, children }) => {
            const language = /language-(\w+)/.exec(className ?? '')?.[1]
            const value = String(children).replace(/\n$/, '')
            if (language === 'mermaid') return <MermaidDiagram chart={value} />
            if (!className && !value.includes('\n')) return <code className="rounded-md bg-secondary px-1.5 py-0.5 font-mono text-[0.85em]">{children}</code>
            return <pre className="my-5 overflow-auto rounded-xl border border-border bg-secondary/70 p-4 font-mono text-sm leading-relaxed"><code>{value}</code></pre>
          },
          table: ({ children }) => <div className="my-5 overflow-x-auto rounded-xl border border-border elevated"><table className="w-full border-collapse text-sm">{children}</table></div>,
          th: ({ children }) => <th className="border-b border-border px-4 py-2.5 text-left font-medium">{children}</th>,
          td: ({ children }) => <td className="border-b border-border px-4 py-2.5 text-foreground/90">{children}</td>,
          img: ({ src, alt }) => <img src={typeof src === 'string' ? src : ''} alt={alt ?? ''} loading="lazy" className="my-5 w-full rounded-xl border border-border elevated" />,
        }}
      >
        {previewContent}
      </ReactMarkdown>
    </div>
  )
}
