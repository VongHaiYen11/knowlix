import { Calculator, Coins, FileText, MessageSquareText, Pencil, Upload, X } from 'lucide-react'
import type { DragEvent, RefObject } from 'react'
import { Button } from '@/components/ui/Button'
import type { AiCustomizationProfile, AiWorkflow, CostEstimateResponse } from '@/services/aiCustomizationService'
import { cn } from '@/utils/cn'

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

function formatTokens(value: number) {
  return new Intl.NumberFormat('en-US').format(value)
}

function formatUsd(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 6 }).format(value)
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

export function CostEstimatorCard({ profile, workflow, onOpen }: { profile: AiCustomizationProfile; workflow: AiWorkflow; onOpen: () => void }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="grid gap-5 p-6 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="flex gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-primary">
            <Calculator className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div>
            <h2 className="font-serif text-2xl tracking-tight">Trial Cost Estimator</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Try a file or question against the current customization before committing real AI work.</p>
          </div>
        </div>
        <Button icon={<Coins className="h-4 w-4" />} onClick={onOpen}>Open estimator</Button>
      </div>
      <div className="grid border-t border-border bg-background/50 sm:grid-cols-3">
        <FeatureStat label="Mode" value={workflow === 'ingestion' ? 'Upload trial' : 'Research trial'} />
        <FeatureStat label="Ingestion model" value={profile.ingestModel} />
        <FeatureStat label="Research model" value={profile.researchModel} />
      </div>
    </section>
  )
}

export function EstimatorModal(props: {
  open: boolean
  workflow: AiWorkflow
  file: File | null
  question: string
  estimate: CostEstimateResponse | null
  dragging: boolean
  estimating: boolean
  fileInputRef: RefObject<HTMLInputElement | null>
  onClose: () => void
  onWorkflowChange: (workflow: AiWorkflow) => void
  onQuestionChange: (value: string) => void
  onFileChange: (file: File | null) => void
  onDragState: (dragging: boolean) => void
  onDrop: (event: DragEvent<HTMLDivElement>) => void
  onEstimate: () => void
}) {
  if (!props.open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button className="absolute inset-0 bg-foreground/25" aria-label="Close cost estimator" onClick={props.onClose} />
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl border border-border bg-card shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="flex gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
              <Calculator className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <div>
              <h2 className="font-serif text-2xl leading-tight tracking-tight">Trial Cost Estimator</h2>
              <p className="mt-1 text-sm text-muted-foreground">Estimate relative cost without saving trial data.</p>
            </div>
          </div>
          <button className="rounded-lg p-1 text-muted-foreground transition hover:bg-secondary hover:text-foreground" onClick={props.onClose} aria-label="Close estimator">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-5 p-5">
          <div className="inline-flex rounded-lg border border-border bg-background p-0.5">
            {(['ingestion', 'research'] as const).map((option) => (
              <button key={option} onClick={() => props.onWorkflowChange(option)} className={cn('inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs capitalize transition', props.workflow === option ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
                {option === 'ingestion' ? <Upload className="h-3.5 w-3.5" /> : <MessageSquareText className="h-3.5 w-3.5" />}
                {option}
              </button>
            ))}
          </div>

          {props.workflow === 'ingestion' ? (
            <div
              onDragOver={(event) => { event.preventDefault(); props.onDragState(true) }}
              onDragLeave={() => props.onDragState(false)}
              onDrop={props.onDrop}
              className={cn('rounded-2xl border border-dashed p-6 text-center transition', props.dragging ? 'border-primary bg-accent' : 'border-border bg-background')}
            >
              <input ref={props.fileInputRef} type="file" accept=".pdf,.docx,.txt,.md,.markdown" className="hidden" onChange={(event) => props.onFileChange(event.target.files?.[0] ?? null)} />
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-card text-primary">
                <FileText className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <h3 className="mt-4 text-base font-medium text-foreground">{props.file ? props.file.name : 'Drop a trial file here'}</h3>
              <p className="mt-1 text-sm text-muted-foreground">PDF, DOCX, TXT, Markdown. The file is read only for estimation.</p>
              <Button className="mt-4" variant="outline" icon={<Upload className="h-4 w-4" />} onClick={() => props.fileInputRef.current?.click()}>Upload trial file</Button>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-background p-4">
              <label className="text-sm font-medium text-foreground" htmlFor="trial-question">Trial question</label>
              <textarea id="trial-question" value={props.question} onChange={(event) => props.onQuestionChange(event.target.value)} rows={5} placeholder="Ask something you would normally research..." className="mt-3 min-h-32 w-full resize-y rounded-xl border border-border bg-card px-4 py-3 text-sm leading-relaxed text-foreground focus:outline-none" />
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={props.onEstimate} disabled={props.estimating || (props.workflow === 'ingestion' ? !props.file : !props.question.trim())} icon={<Coins className="h-4 w-4" />}>
              {props.estimating ? 'Estimating...' : 'Estimate'}
            </Button>
          </div>

          {props.estimate && <EstimateResult estimate={props.estimate} />}
        </div>
      </div>
    </div>
  )
}

function EstimateResult({ estimate }: { estimate: CostEstimateResponse }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="grid gap-3 text-sm sm:grid-cols-3">
        <Metric label="Model" value={estimate.model} />
        <Metric label="Cost range" value={`${formatUsd(estimate.estimatedCost.lowUsd)} - ${formatUsd(estimate.estimatedCost.highUsd)}`} featured />
        <Metric label="Input tokens" value={formatTokens(estimate.estimatedInputTokens)} />
        <Metric label="Output tokens" value={`${formatTokens(estimate.estimatedOutputTokens.low)} - ${formatTokens(estimate.estimatedOutputTokens.high)}`} />
        <Metric label="Thinking tokens" value={`${formatTokens(estimate.estimatedThinkingTokens.low)} - ${formatTokens(estimate.estimatedThinkingTokens.high)}`} />
        <Metric label="Embedding tokens" value={formatTokens(estimate.estimatedEmbeddingTokens)} />
      </div>
      {estimate.file && <p className="mt-3 text-xs text-muted-foreground">Trial file: {estimate.file.name} - {estimate.file.kind} - {formatTokens(estimate.file.sizeBytes)} bytes</p>}
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{estimate.disclaimer}</p>
    </div>
  )
}

function FeatureStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-border px-6 py-4 sm:border-r sm:last:border-r-0">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm text-foreground">{value}</p>
    </div>
  )
}

function Metric({ label, value, featured = false }: { label: string; value: string; featured?: boolean }) {
  return (
    <div className={cn('rounded-xl border border-border px-3 py-3', featured ? 'bg-accent text-accent-foreground' : 'bg-card')}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}
