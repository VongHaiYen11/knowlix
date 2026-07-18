import { RotateCcw, SlidersHorizontal, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState, type DragEvent } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { Button } from '@/components/ui/Button'
import { CostEstimatorCard, EstimatorModal, PromptEditModal, PromptPreviewRow, promptMeta, type PromptKey } from '@/features/customization/CustomizationPanels'
import { SettingsGroup, SettingsRow } from '@/features/settings/SettingsGroup'
import { aiCustomizationService, type AiCustomizationProfile, type AiCustomizationResponse, type AiReasoning, type AiWorkflow, type CostEstimateResponse } from '@/services/aiCustomizationService'
import { cn } from '@/utils/cn'

const reasoningOptions: Array<{ value: AiReasoning; label: string }> = [
  { value: 'auto', label: 'Auto' },
  { value: 'low', label: 'Low' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'high', label: 'High' },
]

function temperatureValue(value: number | null) {
  return value === null ? '' : String(value)
}

function parseTemperature(value: string) {
  if (!value.trim()) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function CustomizationPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [data, setData] = useState<AiCustomizationResponse | null>(null)
  const [draft, setDraft] = useState<AiCustomizationProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [autoSaving, setAutoSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [estimating, setEstimating] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [promptEditor, setPromptEditor] = useState<{ key: PromptKey; value: string } | null>(null)
  const [estimatorOpen, setEstimatorOpen] = useState(false)
  const [workflow, setWorkflow] = useState<AiWorkflow>('ingestion')
  const [estimateFile, setEstimateFile] = useState<File | null>(null)
  const [question, setQuestion] = useState('')
  const [estimate, setEstimate] = useState<CostEstimateResponse | null>(null)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    let cancelled = false
    aiCustomizationService.get()
      .then((response) => {
        if (cancelled) return
        setData(response)
        setDraft(response.profile)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load customization')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function persist(next: AiCustomizationProfile, successMessage = 'Saved automatically.') {
    setAutoSaving(true)
    setNotice(null)
    setError(null)
    try {
      const response = await aiCustomizationService.patch(next)
      setData(response)
      setDraft(response.profile)
      setNotice(successMessage)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save customization')
    } finally {
      setAutoSaving(false)
    }
  }

  function updateAndSave<K extends keyof AiCustomizationProfile>(key: K, value: AiCustomizationProfile[K]) {
    if (!draft) return
    const next = { ...draft, [key]: value }
    setDraft(next)
    void persist(next)
  }

  function openPromptEditor(key: PromptKey) {
    if (!draft) return
    setPromptEditor({ key, value: draft[key] })
  }

  function savePromptEditor() {
    if (!promptEditor) return
    if (draft) {
      const next = { ...draft, [promptEditor.key]: promptEditor.value }
      setDraft(next)
      void persist(next, 'Prompt saved.')
    }
    setPromptEditor(null)
  }

  async function reset() {
    setResetting(true)
    setNotice(null)
    setError(null)
    try {
      const response = await aiCustomizationService.reset()
      setData(response)
      setDraft(response.profile)
      setEstimate(null)
      setNotice('Customization reset to defaults.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset customization')
    } finally {
      setResetting(false)
    }
  }

  async function runEstimate() {
    setEstimating(true)
    setNotice(null)
    setError(null)
    setEstimate(null)
    try {
      const response = workflow === 'ingestion'
        ? estimateFile ? await aiCustomizationService.estimateIngestion(estimateFile) : null
        : await aiCustomizationService.estimateResearch(question)
      if (!response) {
        setError('Choose a file before estimating ingestion cost.')
        return
      }
      setEstimate(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not estimate cost')
    } finally {
      setEstimating(false)
    }
  }

  function pickDropFile(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (file) {
      setEstimateFile(file)
      setEstimate(null)
    }
  }

  if (loading || !draft || !data) {
    return (
      <PageShell variant="readable">
        <PageHeader title="Customization" description="Tune how Knowlix uses AI." />
        <div className="h-96 animate-pulse rounded-2xl border border-border bg-card" />
      </PageShell>
    )
  }

  return (
    <PageShell variant="readable">
      <PageHeader title="Customization" description="Tune Knowledge ingestion, research behavior, and estimate relative AI cost." />
      <div className="space-y-8">
        {(notice || error || autoSaving) && (
          <div className={cn('rounded-2xl border px-5 py-3 text-sm', error ? 'border-destructive/30 bg-destructive/5 text-destructive' : 'border-primary/20 bg-accent text-accent-foreground')}>
            {error ?? (autoSaving ? 'Saving...' : notice)}
          </div>
        )}

        <SettingsGroup icon={SlidersHorizontal} title="Knowledge Ingestion">
          <SettingsRow label="Model" hint="Used when upload processing summarizes a Source and extracts Knowledge pages.">
            <select value={draft.ingestModel} onChange={(event) => updateAndSave('ingestModel', event.target.value)} className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none sm:w-72">
              {data.modelCatalog.map((model) => <option key={model.id} value={model.id}>{model.label}</option>)}
            </select>
          </SettingsRow>
          <SettingsRow label="Reasoning" hint="Controls the relative thinking budget for ingestion calls.">
            <select value={draft.ingestReasoning} onChange={(event) => updateAndSave('ingestReasoning', event.target.value as AiReasoning)} className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none sm:w-72">
              {reasoningOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </SettingsRow>
          <SettingsRow label="Temperature" hint="Leave blank to use the model default. Use 0-1 for more control.">
            <input value={temperatureValue(draft.ingestTemperature)} onChange={(event) => updateAndSave('ingestTemperature', parseTemperature(event.target.value))} inputMode="decimal" placeholder="Model default" className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm focus:outline-none sm:w-72" />
          </SettingsRow>
          <PromptPreviewRow meta={promptMeta.knowledgeDefinition} value={draft.knowledgeDefinition} onEdit={() => openPromptEditor('knowledgeDefinition')} />
          <PromptPreviewRow meta={promptMeta.knowledgeExtractionInstructions} value={draft.knowledgeExtractionInstructions} onEdit={() => openPromptEditor('knowledgeExtractionInstructions')} />
        </SettingsGroup>

        <SettingsGroup icon={Sparkles} title="Research">
          <SettingsRow label="Model" hint="Used for candidate selection and final research answers.">
            <select value={draft.researchModel} onChange={(event) => updateAndSave('researchModel', event.target.value)} className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none sm:w-72">
              {data.modelCatalog.map((model) => <option key={model.id} value={model.id}>{model.label}</option>)}
            </select>
          </SettingsRow>
          <SettingsRow label="Reasoning" hint="Controls the relative thinking budget for final answers.">
            <select value={draft.researchReasoning} onChange={(event) => updateAndSave('researchReasoning', event.target.value as AiReasoning)} className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none sm:w-72">
              {reasoningOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </SettingsRow>
          <SettingsRow label="Temperature" hint="Leave blank to use the model default. Selection stays deterministic server-side.">
            <input value={temperatureValue(draft.researchTemperature)} onChange={(event) => updateAndSave('researchTemperature', parseTemperature(event.target.value))} inputMode="decimal" placeholder="Model default" className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm focus:outline-none sm:w-72" />
          </SettingsRow>
          <PromptPreviewRow meta={promptMeta.researchAnswerInstructions} value={draft.researchAnswerInstructions} onEdit={() => openPromptEditor('researchAnswerInstructions')} />
        </SettingsGroup>

        <CostEstimatorCard profile={draft} workflow={workflow} onOpen={() => setEstimatorOpen(true)} />

        <Button className="w-full" variant="outline" icon={<RotateCcw className="h-4 w-4" />} onClick={reset} disabled={resetting || autoSaving}>
            {resetting ? 'Resetting...' : 'Reset all customization to defaults'}
          </Button>
      </div>

      <PromptEditModal
        editor={promptEditor}
        onChange={(value) => setPromptEditor((current) => current ? { ...current, value } : current)}
        onCancel={() => setPromptEditor(null)}
        onSave={savePromptEditor}
      />

      <EstimatorModal
        open={estimatorOpen}
        workflow={workflow}
        file={estimateFile}
        question={question}
        estimate={estimate}
        dragging={dragging}
        estimating={estimating}
        fileInputRef={fileInputRef}
        onClose={() => setEstimatorOpen(false)}
        onWorkflowChange={(next) => { setWorkflow(next); setEstimate(null); setError(null) }}
        onQuestionChange={(value) => { setQuestion(value); setEstimate(null) }}
        onFileChange={(file) => { setEstimateFile(file); setEstimate(null) }}
        onDragState={setDragging}
        onDrop={pickDropFile}
        onEstimate={runEstimate}
      />
    </PageShell>
  )
}
