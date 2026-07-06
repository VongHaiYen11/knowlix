import { Clock, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { sourceTypeIcon, statusIcon } from './SourceIcon'
import type { Source } from '@/types/knowledge'

export function SourceList({ sources }: { sources: Source[] }) {
  if (sources.length === 0) return <EmptyState message="Nothing matches yet. Try a different phrasing, or capture something new." />
  return (
    <ul className="space-y-3">
      {sources.map((source) => {
        const Icon = sourceTypeIcon[source.type]
        const StatusIcon = statusIcon[source.status].icon
        return (
          <li key={source.id}>
            <Card className="group flex items-start gap-4 p-5 transition hover:border-ring/40">
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
                <Icon className="h-4 w-4" strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{source.type}</span>
                  <span className="text-muted-foreground/40">·</span>
                  <Badge tone="accent"><Sparkles className="h-2.5 w-2.5" />{source.category}</Badge>
                </div>
                <p className="mt-1 font-serif text-lg leading-snug tracking-tight">{source.title}</p>
                <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{source.excerpt}</p>
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  {source.tags.map((tag) => <span key={tag} className="text-[11px] text-muted-foreground">#{tag}</span>)}
                  <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Clock className="h-3 w-3" />{source.created}</span>
                  <span className={`inline-flex items-center gap-1 text-xs ${statusIcon[source.status].className}`}>
                    <StatusIcon className="h-3.5 w-3.5" />
                    <span className="text-muted-foreground">{source.status}</span>
                  </span>
                </div>
              </div>
            </Card>
          </li>
        )
      })}
    </ul>
  )
}
