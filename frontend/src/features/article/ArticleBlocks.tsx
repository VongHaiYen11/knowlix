import type { ReactNode } from 'react'

export function ArticleSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="mb-4 font-serif text-2xl leading-snug tracking-tight">{title}</h2>
      {children}
    </section>
  )
}

export function TimelineList({ items }: { items: Array<{ date: string; event: string }> }) {
  return (
    <ul className="space-y-4">
      {items.map((item, index) => (
        <li key={`${item.date}-${item.event}`} className="flex gap-4">
          <div className="flex flex-col items-center">
            <span className="mt-1.5 h-2 w-2 rounded-full bg-primary/60" />
            {index < items.length - 1 && <span className="mt-1 w-px flex-1 bg-border" />}
          </div>
          <div className="pb-1">
            <span className="font-mono text-xs text-muted-foreground">{item.date}</span>
            <p className="mt-0.5 text-[15px] leading-relaxed text-foreground/90">{item.event}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}
