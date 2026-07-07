import { CalendarDays, Lightbulb, Link2, Plus, Sparkles } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import sleepImage from '@/assets/sleep.png'
import { useJournal } from '@/hooks/useLibrary'

export function JournalPage() {
  const { data, status } = useJournal()
  return (
    <PageShell variant="readable">
      <PageHeader title="Journal" description="A quiet daily record. Your assistant reads each day and gathers its learnings and connections." action={<Button icon={<Plus className="h-4 w-4" />}>New entry</Button>} />
      {status === 'loading' ? <Skeleton count={2} className="h-72" /> : data.length === 0 ? (
        <EmptyState
          image
          imageSrc={sleepImage}
          icon={CalendarDays}
          title="Nothing in the journal yet"
          message="Your day has a clean little page waiting. Add one note, reflection, or tiny win when you are ready."
          className="py-12"
        />
      ) : (
        <div className="space-y-10">
          {data.map((day) => (
            <article key={day.date}>
              <div className="mb-4 flex items-baseline gap-3"><h2 className="font-serif text-2xl tracking-tight">{day.date}</h2><span className="text-sm text-muted-foreground">{day.weekday}</span></div>
              <Card className="p-4 md:p-5">
                <div className="mb-6 rounded-xl bg-secondary/60 p-4">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground"><Sparkles className="h-3.5 w-3.5" />Daily summary</p>
                  <p className="font-serif text-lg leading-relaxed text-foreground/90">{day.summary}</p>
                </div>
                <ul className="space-y-5">{day.entries.map((entry, index) => <li key={`${entry.time}-${entry.kind}`} className="flex gap-4"><div className="flex flex-col items-center"><span className="mt-1 h-2 w-2 rounded-full bg-primary/60" />{index < day.entries.length - 1 && <span className="mt-1 w-px flex-1 bg-border" />}</div><div><div className="flex items-center gap-2"><span className="font-mono text-xs text-muted-foreground">{entry.time}</span><span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{entry.kind}</span></div><p className="mt-1.5 text-[15px] leading-relaxed text-foreground/90">{entry.text}</p></div></li>)}</ul>
                <div className="mt-6 grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
                  <div><p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground"><Lightbulb className="h-3.5 w-3.5" />Key learnings</p>{day.learnings.map((item) => <p key={item} className="text-sm leading-relaxed text-muted-foreground">{item}</p>)}</div>
                  <div><p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground"><Link2 className="h-3.5 w-3.5" />Connections</p>{day.connections.map((item) => <p key={item} className="text-sm leading-relaxed text-primary">{item}</p>)}</div>
                </div>
              </Card>
            </article>
          ))}
        </div>
      )}
    </PageShell>
  )
}
