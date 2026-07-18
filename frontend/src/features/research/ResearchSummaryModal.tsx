import { Brain, Loader2, RefreshCw, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { MarkdownPreview } from '@/features/editor/MarkdownPreview'
import type { ResearchThread } from '@/services/researchService'

interface ResearchSummaryModalProps {
  open: boolean
  thread?: ResearchThread
  loading?: boolean
  error?: string | null
  onClose: () => void
  onRegenerate: () => void
}

const formatDate = (value?: string) => {
  if (!value) return 'Not generated yet'
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function ResearchSummaryModal({ open, thread, loading = false, error, onClose, onRegenerate }: ResearchSummaryModalProps) {
  if (!open || !thread) return null
  const canRegenerate = thread.messages.length > 3 && !loading

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 py-6 backdrop-blur">
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border bg-secondary/40 px-6 py-5">
          <div>
            <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Brain className="h-3.5 w-3.5" />Conversation summary
            </p>
            <h2 className="font-serif text-2xl tracking-tight">{thread.title || 'Untitled'}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Generated {formatDate(thread.summary?.generatedAt)} · {thread.summary?.model || 'No model yet'} · {thread.summary?.messageCount ?? thread.messages.length} messages
            </p>
          </div>
          <Button variant="ghost" size="icon" aria-label="Close summary modal" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {error ? <p className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p> : null}
          {thread.summary?.content ? (
            <MarkdownPreview content={thread.summary.content} />
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-secondary/30 p-8 text-center">
              <Brain className="mx-auto h-8 w-8 text-primary" strokeWidth={1.75} />
              <h3 className="mt-3 font-serif text-2xl tracking-tight">No summary yet</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                A summary can be generated once this conversation has more than 3 messages.
              </p>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 border-t border-border bg-card/95 p-4 backdrop-blur">
          <Button
            className="w-full"
            onClick={onRegenerate}
            disabled={!canRegenerate}
            icon={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          >
            {loading ? 'Generating summary...' : thread.summary?.content ? 'Regenerate summary' : 'Generate summary'}
          </Button>
        </div>
      </div>
    </div>
  )
}
