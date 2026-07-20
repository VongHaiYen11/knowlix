import { ArrowRight, Sparkles } from 'lucide-react'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import boredImage from '@/assets/bored.png'
import { ROUTES } from '@/constants/routes'
import { cn } from '@/utils/cn'
import type { KnowledgeEntry } from '@/types/knowledge'

export function KnowledgeGrid({
  knowledge,
  selectionMode = false,
  selectedSlugs = [],
  onToggleSelection,
}: {
  knowledge: KnowledgeEntry[]
  selectionMode?: boolean
  selectedSlugs?: string[]
  onToggleSelection?: (slug: string) => void
}) {
  if (knowledge.length === 0) {
    return (
      <EmptyState
        image
        imageSrc={boredImage}
        icon={Sparkles}
        title="No knowledge pages yet"
        message="Once your sources are processed, the useful ideas will show up here as readable pages."
      />
    )
  }
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {knowledge.map((entry) => {
        const selected = selectedSlugs.includes(entry.slug)
        const card = <KnowledgeCard entry={entry} selected={selected} selectionMode={selectionMode} />
        if (selectionMode) {
          return (
            <button key={entry.slug} type="button" className="group block h-full text-left" onClick={() => onToggleSelection?.(entry.slug)}>
              {card}
            </button>
          )
        }
        return (
          <Link key={entry.slug} to={ROUTES.knowledge(entry.slug)} className="group block">
            {card}
          </Link>
        )
      })}
    </div>
  )
}

function KnowledgeCard({ entry, selected, selectionMode }: { entry: KnowledgeEntry; selected: boolean; selectionMode: boolean }) {
  return (
    <Card className={cn(
      'relative flex h-full flex-col p-6 transition hover:border-ring/40',
      selected && 'border-primary/60 bg-primary/5 ring-2 ring-primary/20',
    )}>
      {selectionMode && (
        <span className={cn(
          'absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-md border text-[10px]',
          selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-transparent',
        )}>
          ✓
        </span>
      )}
      <div className="mb-3 flex items-center gap-2 pr-8">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">{entry.category}</span>
        <span className="text-muted-foreground/40">·</span>
        <span className="text-xs text-muted-foreground">{entry.readTime}</span>
      </div>
      <h2 className="font-serif text-2xl leading-snug tracking-tight">{entry.title}</h2>
      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{entry.overview}</p>
      <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-4">
        {entry.tags.slice(0, 3).map((tag, i) => (
          <Badge key={tag} className={i === 2 ? 'hidden md:inline-flex' : ''}>
            #{tag}
          </Badge>
        ))}
        {entry.tags.length > 3 && (
          <span className="hidden text-xs text-muted-foreground md:inline-block">
            +{entry.tags.length - 3}
          </span>
        )}
        {entry.tags.length > 2 && (
          <span className="inline-block text-xs text-muted-foreground md:hidden">
            +{entry.tags.length - 2}
          </span>
        )}
        {!selectionMode && <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />}
      </div>
    </Card>
  )
}
