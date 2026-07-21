import type { ReactNode } from 'react'
import type { KnowledgeTimelineItem } from '@/types/knowledge'

const timelineTimeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Ho_Chi_Minh',
})

export function timelineTime(occurredAt?: string) {
  if (!occurredAt) return undefined
  const timestamp = Date.parse(occurredAt)
  return Number.isFinite(timestamp) ? timelineTimeFormatter.format(timestamp) : undefined
}

export function ArticleSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="mb-4 font-serif text-2xl leading-snug tracking-tight">{title}</h2>
      {children}
    </section>
  )
}

export function TimelineList({ items }: { items: KnowledgeTimelineItem[] }) {
  const newestFirst = items
    .map((item, index) => ({ item, index, timestamp: Date.parse(item.occurredAt || item.date) }))
    .sort((left, right) => {
      const leftHasDate = Number.isFinite(left.timestamp)
      const rightHasDate = Number.isFinite(right.timestamp)
      if (leftHasDate && rightHasDate && left.timestamp !== right.timestamp) {
        return right.timestamp - left.timestamp
      }
      if (leftHasDate !== rightHasDate) return leftHasDate ? -1 : 1
      return right.index - left.index
    })
    .map(({ item }) => item)

  return (
    <ul className="space-y-4">
      {newestFirst.map((item, index) => (
        <li key={`${item.occurredAt || item.date}-${item.event}`} className="flex gap-4">
          <div className="flex flex-col items-center">
            <span className="mt-1.5 h-2 w-2 rounded-full bg-primary/60" />
            {index < newestFirst.length - 1 && <span className="mt-1 w-px flex-1 bg-border" />}
          </div>
          <div className="pb-1">
            <span className="font-mono text-xs text-muted-foreground">
              {item.date}{timelineTime(item.occurredAt) ? ` · ${timelineTime(item.occurredAt)}` : ''}
            </span>
            <p className="mt-0.5 text-[15px] leading-relaxed text-foreground/90">{item.event}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}
