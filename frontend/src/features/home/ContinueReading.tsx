import { ArrowRight, BookOpen } from 'lucide-react'
import { Link } from 'react-router'
import { SectionHeading } from '@/components/common/SectionHeading'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import boredImage from '@/assets/bored.png'
import { ROUTES } from '@/constants/routes'
import type { KnowledgeEntry } from '@/types/knowledge'

export function ContinueReading({ knowledge }: { knowledge: KnowledgeEntry[] }) {
  return (
    <section className="flex h-full flex-col lg:col-span-3">
      <SectionHeading title="Continue reading" href={knowledge.length ? ROUTES.library : undefined} icon={BookOpen} />
      {!knowledge.length ? (
        <EmptyState
          image
          imageSrc={boredImage}
          icon={BookOpen}
          title="Your reading shelf is still sleepy"
          message="Add a source or create a note, and Knowlix will turn it into something worth continuing."
          className="flex-1"
        />
      ) : (
        <div className="grid flex-1 gap-4 md:grid-cols-3">
          {knowledge.slice(0, 3).map((entry) => (
            <Link key={entry.slug} to={ROUTES.knowledge(entry.slug)} className="group block">
              <Card className="flex h-full flex-col p-6 transition hover:border-ring/40">
                <span className="mb-3 text-xs uppercase tracking-wide text-muted-foreground">{entry.category}</span>
                <h3 className="line-clamp-2 font-serif text-xl leading-snug tracking-tight">{entry.title}</h3>
                <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">{entry.overview}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary">
                  Resume
                  <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                </span>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
