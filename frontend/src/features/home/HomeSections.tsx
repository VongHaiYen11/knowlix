import { CalendarDays, Library, Sparkles } from 'lucide-react'
import { Link } from 'react-router'
import { SectionHeading } from '@/components/common/SectionHeading'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import boredCatImage from '@/assets/bored_cat.png'
import { ROUTES } from '@/constants/routes'
import type { JournalDay, NoteItem } from '@/types/knowledge'

export function RecentNotes({ notes }: { notes: NoteItem[] }) {
  return (
    <section className="flex h-full flex-col lg:col-span-2">
      <SectionHeading title="Recent notes" href={notes.length ? ROUTES.library : undefined} icon={Library} />
      {!notes.length ? (
        <EmptyState
          image
          imageSrc={boredCatImage}
          icon={Library}
          title="No notes yet"
          message="Your note corner is ready when you are. Start with one messy thought and let it grow."
          className="flex-1"
        />
      ) : (
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
      )}
    </section>
  )
}

export function DailyInspirationCard({ quote, loading }: { quote: string; loading: boolean }) {
  return (
    <section className="flex h-full flex-col">
      <SectionHeading title="From your assistant" icon={Sparkles} />
      <Card className="relative flex flex-1 overflow-hidden p-6">
        <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-primary/10" />
        <div className="absolute -bottom-10 left-8 h-20 w-20 rounded-full bg-accent/20" />
        <div className="relative flex min-h-0 flex-col">
          <span className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Daily inspiration</p>
          <p className="mt-3 flex-1 font-serif text-2xl leading-snug tracking-tight text-foreground">
            {loading ? 'Finding a gentle thought for today...' : quote}
          </p>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">Refreshes once each day.</p>
        </div>
      </Card>
    </section>
  )
}

export function JournalToday({ journal }: { journal: JournalDay[] }) {
  const today = journal[0]
  if (!today) return null

  return (
    <section className="mt-14">
      <SectionHeading title="Latest journal note" href={ROUTES.journal} icon={CalendarDays} />
      <Link to={ROUTES.journal}>
        <Card className="block p-6 transition hover:border-ring/40">
          <p className="font-serif text-xl leading-snug tracking-tight">{today.weekday}, {today.date}</p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{today.entries[0]?.text ?? 'No notes yet today.'}</p>
          <p className="mt-4 text-xs text-muted-foreground">{today.entries.length} journal note{today.entries.length === 1 ? '' : 's'} captured</p>
        </Card>
      </Link>
    </section>
  )
}
