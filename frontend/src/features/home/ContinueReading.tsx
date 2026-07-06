import { ArrowRight, BookOpen } from 'lucide-react'
import { Link } from 'react-router'
import { SectionHeading } from '@/components/common/SectionHeading'
import { Card } from '@/components/ui/Card'
import { ROUTES } from '@/constants/routes'
import type { KnowledgeEntry } from '@/types/knowledge'

export function ContinueReading({ knowledge }: { knowledge: KnowledgeEntry[] }) {
  return (
    <section className="mt-14">
      <SectionHeading title="Continue reading" href={ROUTES.library} icon={BookOpen} />
      <div className="grid gap-4 md:grid-cols-2">
        {knowledge.slice(0, 2).map((entry) => (
          <Link key={entry.slug} to={ROUTES.knowledge(entry.slug)} className="group block">
            <Card className="flex h-full flex-col p-6 transition hover:border-ring/40">
              <span className="mb-3 text-xs uppercase tracking-wide text-muted-foreground">{entry.category}</span>
              <h3 className="font-serif text-2xl leading-snug tracking-tight">{entry.title}</h3>
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{entry.overview}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary">
                Resume
                <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
              </span>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  )
}
