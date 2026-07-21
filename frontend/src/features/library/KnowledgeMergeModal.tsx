import { useMemo, useState } from 'react'
import { GitMerge, Loader2, RefreshCw, Sparkles, X } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { MarkdownPreview } from '@/features/editor/MarkdownPreview'
import { timelineTime } from '@/features/article/ArticleBlocks'
import { libraryService } from '@/services/libraryService'
import { cn } from '@/utils/cn'
import type { KnowledgeEntry, KnowledgeMergeDraft, KnowledgeMergeMode, KnowledgeMergeStyle } from '@/types/knowledge'

const styleOptions: Array<{ value: KnowledgeMergeStyle; label: string; hint: string }> = [
  { value: 'balanced', label: 'Balanced', hint: 'Readable article with headings.' },
  { value: 'bullet', label: 'Bullet notes', hint: 'Compact grouped notes.' },
  { value: 'paragraph', label: 'Paragraph', hint: 'Flowing prose with fewer lists.' },
  { value: 'course_notes', label: 'Course notes', hint: 'Study-oriented definitions and examples.' },
]

export function KnowledgeMergeModal({
  open,
  selectedKnowledge,
  onClose,
  onApplied,
}: {
  open: boolean
  selectedKnowledge: KnowledgeEntry[]
  onClose: () => void
  onApplied: (entry: KnowledgeEntry) => void
}) {
  const [mode, setMode] = useState<KnowledgeMergeMode>('automatic')
  const [targetTitle, setTargetTitle] = useState('')
  const [context, setContext] = useState('')
  const [style, setStyle] = useState<KnowledgeMergeStyle>('balanced')
  const [draft, setDraft] = useState<KnowledgeMergeDraft | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sourceSlugs = useMemo(() => selectedKnowledge.map((entry) => entry.slug), [selectedKnowledge])

  if (!open) return null

  async function generatePreview() {
    setLoadingPreview(true)
    setError(null)
    try {
      const nextDraft = await libraryService.previewKnowledgeMerge({
        sourceSlugs,
        mode,
        targetTitle: targetTitle.trim() || undefined,
        context: context.trim() || undefined,
        style,
      })
      setDraft(nextDraft)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate merge preview')
    } finally {
      setLoadingPreview(false)
    }
  }

  async function applyMerge() {
    if (!draft) return
    setApplying(true)
    setError(null)
    try {
      const merged = await libraryService.applyKnowledgeMerge({ sourceSlugs, draft })
      onApplied(merged)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply merge')
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 py-6 backdrop-blur">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border bg-secondary/30 px-6 py-5">
          <div>
            <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <GitMerge className="h-3.5 w-3.5" /> Merge Knowledge
            </p>
            <h2 className="font-serif text-2xl tracking-tight">Turn small pages into one stronger Knowledge page</h2>
            <p className="mt-1 text-sm text-muted-foreground">Preview first; nothing is changed until you apply the merge.</p>
          </div>
          <Button variant="ghost" size="icon" aria-label="Close merge modal" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid max-h-[calc(92vh-92px)] overflow-y-auto lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="border-b border-border p-6 lg:border-b-0 lg:border-r">
            <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Selected pages</h3>
            <div className="mt-3 space-y-2">
              {selectedKnowledge.map((entry) => (
                <Card key={entry.slug} className="p-3">
                  <p className="text-sm font-medium leading-snug">{entry.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{entry.overview}</p>
                </Card>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-2">
              {(['automatic', 'manual'] as KnowledgeMergeMode[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  className={cn('rounded-2xl border p-3 text-left text-sm transition', mode === item ? 'border-primary bg-primary/10 text-foreground' : 'border-border bg-background text-muted-foreground hover:border-ring/40')}
                  onClick={() => setMode(item)}
                >
                  <span className="block font-medium capitalize">{item}</span>
                  <span className="mt-1 block text-xs">{item === 'automatic' ? 'Let AI choose.' : 'Guide the merge.'}</span>
                </button>
              ))}
            </div>

            {mode === 'manual' && (
              <div className="mt-5 space-y-4">
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">Topic</span>
                  <input value={targetTitle} onChange={(event) => setTargetTitle(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-ring" placeholder="e.g. Decision Tree fundamentals" />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">Context</span>
                  <textarea value={context} onChange={(event) => setContext(event.target.value)} rows={4} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring" placeholder="Course, point of view, what to emphasize..." />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">Writing style</span>
                  <select value={style} onChange={(event) => setStyle(event.target.value as KnowledgeMergeStyle)} className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-ring">
                    {styleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  <span className="mt-1 block text-xs text-muted-foreground">{styleOptions.find((option) => option.value === style)?.hint}</span>
                </label>
              </div>
            )}

            {error ? <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}

            <div className="mt-6 flex flex-wrap gap-2">
              <Button variant="outline" onClick={generatePreview} disabled={loadingPreview || applying || sourceSlugs.length < 2} icon={loadingPreview ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}>
                {draft ? 'Regenerate preview' : 'Generate preview'}
              </Button>
              <Button variant="ghost" onClick={onClose} disabled={loadingPreview || applying}>Cancel</Button>
            </div>
          </aside>

          <main className="min-w-0 p-6">
            {!draft ? (
              <div className="flex min-h-[520px] items-center justify-center rounded-3xl border border-dashed border-border bg-secondary/30 p-8 text-center">
                <div className="max-w-md">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <RefreshCw className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 font-serif text-2xl tracking-tight">Preview before committing</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Generate a draft to inspect the merged title, tags, sources, timeline, and Markdown body.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="rounded-3xl border border-border bg-background p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{draft.category} · /{draft.slug}</p>
                      <h3 className="mt-1 font-serif text-3xl tracking-tight">{draft.title}</h3>
                      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{draft.overview}</p>
                    </div>
                    <Button onClick={applyMerge} disabled={applying || loadingPreview} icon={applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitMerge className="h-4 w-4" />}>
                      Apply merge
                    </Button>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-1.5">{draft.tags.map((tag) => <Badge key={tag}>#{tag}</Badge>)}</div>
                  {draft.reason ? <p className="mt-4 rounded-2xl bg-primary/10 px-4 py-3 text-sm text-primary">{draft.reason}</p> : null}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="p-4">
                    <h4 className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Source files</h4>
                    <ul className="mt-3 space-y-1.5 text-sm text-foreground">
                      {draft.sources.map((source) => <li key={source.id}>{source.title}</li>)}
                      {!draft.sources.length && <li className="text-muted-foreground">No source file metadata attached.</li>}
                    </ul>
                  </Card>
                  <Card className="p-4">
                    <h4 className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Timeline</h4>
                    <ul className="mt-3 space-y-1.5 text-sm text-foreground">
                      {draft.timeline.map((item) => <li key={`${item.occurredAt || item.date}-${item.event}`}><span className="text-muted-foreground">{item.date}{timelineTime(item.occurredAt) ? ` · ${timelineTime(item.occurredAt)}` : ''}</span> — {item.event}</li>)}
                    </ul>
                  </Card>
                </div>

                <div className="rounded-3xl border border-border bg-background p-5">
                  <MarkdownPreview content={draft.content} />
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
