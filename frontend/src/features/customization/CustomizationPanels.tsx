import { Pencil, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export type PromptKey = 'knowledgeDefinition' | 'knowledgeExtractionInstructions' | 'researchAnswerInstructions'

export const promptMeta: Record<PromptKey, { title: string; hint: string }> = {
  knowledgeDefinition: {
    title: 'Knowledge definition',
    hint: 'A required definition used by ingestion and Knowledge merge.',
  },
  knowledgeExtractionInstructions: {
    title: 'Knowledge requirements',
    hint: 'Required rules for summaries, extraction, updates, replacements, and merges.',
  },
  researchAnswerInstructions: {
    title: 'Research requirements',
    hint: 'Required rules for research answers and conversation summaries, within grounding and citation constraints.',
  },
}

export function PromptPreviewRow({ meta, value, onEdit }: { meta: { title: string; hint: string }; value: string; onEdit: () => void }) {
  return (
    <div className="grid gap-3 px-6 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[15px] text-foreground">{meta.title}</p>
          <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{meta.hint}</p>
        </div>
        <Button size="sm" variant="outline" icon={<Pencil className="h-3.5 w-3.5" />} onClick={onEdit}>Edit</Button>
      </div>
      <div className="rounded-xl border border-border bg-background px-4 py-3">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Current requirements</p>
        <p className="line-clamp-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{value}</p>
      </div>
    </div>
  )
}

export function PromptEditModal({ editor, onChange, onCancel, onSave }: { editor: { key: PromptKey; value: string } | null; onChange: (value: string) => void; onCancel: () => void; onSave: () => void }) {
  if (!editor) return null
  const meta = promptMeta[editor.key]
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button className="absolute inset-0 bg-foreground/25" aria-label="Close prompt editor" onClick={onCancel} />
      <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-card shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h2 className="font-serif text-2xl leading-tight tracking-tight">{meta.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{meta.hint}</p>
          </div>
          <button className="rounded-lg p-1 text-muted-foreground transition hover:bg-secondary hover:text-foreground" onClick={onCancel} aria-label="Close prompt editor">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">
          <textarea value={editor.value} onChange={(event) => onChange(event.target.value)} rows={12} className="min-h-72 w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-sm leading-relaxed text-foreground focus:outline-none" />
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
          <Button size="sm" onClick={onSave}>Save requirements</Button>
        </div>
      </div>
    </div>
  )
}
