import ReactMarkdown from 'react-markdown'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import { MermaidDiagram } from './MermaidDiagram'

export function MarkdownPreview({ content }: { content: string }) {
  return (
    <div className="max-w-none text-foreground">
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
        {content}
      </ReactMarkdown>
    </div>
  )
}
