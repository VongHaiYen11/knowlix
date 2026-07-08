import { CalendarDays, Plus, Tag, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import sleepImage from '@/assets/sleep.png'
import { useJournal } from '@/hooks/useLibrary'
import { libraryService } from '@/services/libraryService'
import type { JournalDay } from '@/types/knowledge'

function parseTags(value: string) {
  return Array.from(new Set(value.split(',').map((tag) => tag.trim()).filter(Boolean)))
}

function JournalEntryModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (day: JournalDay) => Promise<void> }) {
  const [text, setText] = useState('')
  const [tags, setTags] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const textRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    requestAnimationFrame(() => textRef.current?.focus())
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        void submit()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  if (!open) return null

  async function submit() {
    const cleanText = text.trim()
    if (!cleanText) {
      setError('Write a quick note before saving.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const day = await libraryService.appendJournalEntry({ text: cleanText, tags: parseTags(tags) })
      await onCreated(day)
      setText('')
      setTags('')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save journal note.')
    } finally {
      setSaving(false)
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    void submit()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button type="button" className="absolute inset-0 bg-foreground/25" aria-label="Close journal note dialog" onClick={onClose} />
      <form onSubmit={onSubmit} className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-5 shadow-xl">
        <button type="button" className="absolute right-3 top-3 rounded-lg p-1 text-muted-foreground transition hover:bg-secondary hover:text-foreground" onClick={onClose} aria-label="Close dialog">
          <X className="h-4 w-4" />
        </button>
        <div className="mb-5">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Today</p>
          <h2 className="mt-1 font-serif text-2xl leading-snug tracking-tight">New journal note</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Capture the thought now. Tags are only for your own sorting later.</p>
        </div>
        <label className="block text-sm font-medium text-foreground" htmlFor="journal-note-text">Note</label>
        <textarea
          id="journal-note-text"
          ref={textRef}
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={6}
          className="mt-2 w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
          placeholder="What popped up while working?"
        />
        <label className="mt-4 block text-sm font-medium text-foreground" htmlFor="journal-note-tags">Tags</label>
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
          <Tag className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            id="journal-note-tags"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            placeholder="idea, todo, meeting"
          />
        </div>
        {error && <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Adding...' : 'Add note'}</Button>
        </div>
      </form>
    </div>
  )
}

export function JournalPage() {
  const { data, status, setData } = useJournal()
  const [modalOpen, setModalOpen] = useState(false)

  async function handleCreated(day: JournalDay) {
    setData((current) => [day, ...current.filter((item) => item.date !== day.date)].sort((a, b) => b.date.localeCompare(a.date)))
  }

  return (
    <PageShell variant="readable">
      <PageHeader
        title="Journal"
        description="Jot down notes, unfinished thoughts, and pop-up ideas for today."
        action={<Button icon={<Plus className="h-4 w-4" />} onClick={() => setModalOpen(true)}>New entry</Button>}
      />
      {status === 'loading' ? <Skeleton count={2} className="h-72" /> : data.length === 0 ? (
        <EmptyState
          image
          imageSrc={sleepImage}
          icon={CalendarDays}
          title="Nothing in the journal yet"
          message="Capture the first thought, todo, or loose idea that shows up today."
          className="py-12"
        />
      ) : (
        <div className="space-y-10">
          {data.map((day) => (
            <article key={day.date}>
              <div className="mb-4 flex items-baseline gap-3">
                <h2 className="font-serif text-2xl tracking-tight">{day.date}</h2>
                <span className="text-sm text-muted-foreground">{day.weekday}</span>
              </div>
              <Card className="p-4 md:p-5">
                <ul className="space-y-5">
                  {day.entries.map((entry, index) => (
                    <li key={entry.id || `${day.date}-${entry.time}-${index}`} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <span className="mt-1 h-2 w-2 rounded-full bg-primary/60" />
                        {index < day.entries.length - 1 && <span className="mt-1 w-px flex-1 bg-border" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">{entry.time}</span>
                          {(entry.tags ?? []).map((tag) => (
                            <span key={tag} className="rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">#{tag}</span>
                          ))}
                        </div>
                        <p className="mt-1.5 whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/90">{entry.text}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            </article>
          ))}
        </div>
      )}
      <JournalEntryModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={handleCreated} />
    </PageShell>
  )
}
