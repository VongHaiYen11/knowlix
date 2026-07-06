import { useEffect, useId, useState } from 'react'
import { useThemeContext } from '@/components/layout/ThemeProvider'

export function MermaidDiagram({ chart }: { chart: string }) {
  const { resolvedTheme } = useThemeContext()
  const id = useId().replace(/:/g, '')
  const [svg, setSvg] = useState('')

  useEffect(() => {
    let cancelled = false
    async function render() {
      try {
        const mermaid = (await import('mermaid')).default
        mermaid.initialize({ startOnLoad: false, securityLevel: 'loose', theme: resolvedTheme === 'dark' ? 'dark' : 'neutral' })
        const result = await mermaid.render(`mmd-${id}`, chart.trim())
        if (!cancelled) setSvg(result.svg)
      } catch {
        if (!cancelled) setSvg('')
      }
    }
    void render()
    return () => {
      cancelled = true
    }
  }, [chart, id, resolvedTheme])

  if (!svg) return <pre className="overflow-auto rounded-xl border border-border bg-secondary p-4 font-mono text-xs text-muted-foreground">{chart}</pre>
  return <div className="my-4 flex justify-center overflow-auto rounded-xl border border-border bg-card p-4 elevated [&_svg]:max-w-full" dangerouslySetInnerHTML={{ __html: svg }} />
}
