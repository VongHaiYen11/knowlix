import { ArrowRight, Sparkles } from 'lucide-react'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import boredImage from '@/assets/bored.png'
import { ROUTES } from '@/constants/routes'
import type { KnowledgeEntry } from '@/types/knowledge'

export function KnowledgeGrid({ knowledge }: { knowledge: KnowledgeEntry[] }) {
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
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {knowledge.map((entry) => (
          <Link key={entry.slug} to={ROUTES.knowledge(entry.slug)} className="group block">
            <Card className="flex h-full flex-col p-6 transition hover:border-ring/40">
              <div className="mb-3 flex items-center gap-2">
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
                <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>
            </Card>
          </Link>
        ))}
      </div>
      <div className="mt-6 flex items-center gap-3 rounded-2xl border border-dashed border-border bg-secondary/40 p-6">
        <Sparkles className="h-5 w-5 shrink-0 text-primary" strokeWidth={1.75} />
        <p className="text-sm leading-relaxed text-muted-foreground">Your assistant is drafting a page on <span className="text-foreground">Memory Palaces</span> from a recent article.</p>
      </div>
    </>
  )
}
