import { ArrowRight, ArrowUpRight, CalendarDays, Library, Share2, Sparkles } from 'lucide-react'
import { Link } from 'react-router'
import { SectionHeading } from '@/components/common/SectionHeading'
import { Card } from '@/components/ui/Card'
import { ROUTES } from '@/constants/routes'
import type { JournalDay, NoteItem } from '@/types/knowledge'

export function RecentNotes({ notes }: { notes: NoteItem[] }) {
  return (
    <section className="lg:col-span-2">
      <SectionHeading title="Recent notes" href={ROUTES.library} icon={Library} />
      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card elevated">
        {notes.slice(0, 4).map((note) => (
          <li key={note.id}>
            <Link to={ROUTES.note(note.id)} className="flex items-start gap-4 px-6 py-4 transition hover:bg-secondary/60">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] text-foreground">{note.title}</p>
                <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{note.excerpt}</p>
              </div>
              <span className="shrink-0 whitespace-nowrap pt-0.5 text-xs text-muted-foreground">{note.updated}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function AssistantSuggestions() {
  const suggestions = [
    ['Three notes on retrieval could become a new page: Personal Knowledge Management.', 'Draft page'],
    ['Your Active Recall page and a new PDF overlap. Merge to keep one source of truth?', 'Review merge'],
    ['You have not revisited The Forgetting Curve in a week. A short review is due.', 'Review now'],
  ]
  return (
    <section>
      <SectionHeading title="From your assistant" icon={Sparkles} />
      <div className="space-y-3">
        {suggestions.map(([text, action]) => (
          <Card key={text} className="p-5">
            <p className="text-sm leading-relaxed text-foreground">{text}</p>
            <button className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary transition hover:opacity-80">
              {action}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </Card>
        ))}
      </div>
    </section>
  )
}

export function JournalAndGraph({ journal }: { journal: JournalDay[] }) {
  const today = journal[0]
  return (
    <div className="mt-14 grid gap-10 lg:grid-cols-3">
      <section className="lg:col-span-2">
        <SectionHeading title="Journal today" href={ROUTES.journal} icon={CalendarDays} />
        <Link to={ROUTES.journal}>
          <Card className="block p-6 transition hover:border-ring/40">
            <p className="font-serif text-xl leading-snug tracking-tight">{today?.weekday}, {today?.date}</p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{today?.summary}</p>
            <p className="mt-4 text-xs text-muted-foreground">{today?.entries.length ?? 0} entries · summary generated</p>
          </Card>
        </Link>
      </section>
      <section>
        <SectionHeading title="Explore the graph" href={ROUTES.graph} icon={Share2} />
        <Link to={ROUTES.graph} className="group block">
          <Card className="p-6 transition hover:border-ring/40">
            <p className="text-sm leading-relaxed text-foreground">Five knowledge pages are woven together by shared ideas about memory and method.</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary">
              Open graph
              <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
            </span>
          </Card>
        </Link>
      </section>
    </div>
  )
}
