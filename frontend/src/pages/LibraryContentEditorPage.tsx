import { ArrowLeft, Save } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button } from '@/components/ui/Button'
import { ROUTES } from '@/constants/routes'
import { EditorToolbar } from '@/features/editor/EditorToolbar'
import { MarkdownPreview } from '@/features/editor/MarkdownPreview'
import { libraryService } from '@/services/libraryService'
import type { EditorView } from '@/hooks/useNoteEditor'
import { cn } from '@/utils/cn'

interface LibraryContentEditorPageProps {
  id: string
  kind: 'source' | 'knowledge'
}

export function LibraryContentEditorPage({ id, kind }: LibraryContentEditorPageProps) {
  const navigate = useNavigate()
  const ref = useRef<HTMLTextAreaElement>(null)
  const splitRef = useRef<HTMLDivElement>(null)
  const [draft, setDraft] = useState('# Untitled\n\n')
  const [view, setView] = useState<EditorView>('split')
  const [editorWidth, setEditorWidth] = useState(52)
  const [saving, setSaving] = useState(false)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    let active = true
    async function load() {
      if (kind === 'source') {
        const item = await libraryService.getSourceById(id)
        if (!active) return
        if (!item) {
          setMissing(true)
          return
        }
        setDraft(libraryService.sourceToMarkdown(item))
      } else {
        const item = await libraryService.getKnowledgeBySlug(id)
        if (!active) return
        if (!item) {
          setMissing(true)
          return
        }
        setDraft(libraryService.knowledgeToMarkdown(item))
      }
    }
    void load()
    return () => { active = false }
  }, [id, kind])

  const title = useMemo(() => draft.match(/^#\s+(.+)/m)?.[1] ?? 'Untitled', [draft])
  const words = useMemo(() => draft.trim().split(/\s+/).filter(Boolean).length, [draft])
  const backRoute = kind === 'source' ? ROUTES.source(id) : ROUTES.knowledge(id)

  function surround(before: string, after = before) {
    const area = ref.current
    if (!area) return
    const selected = draft.slice(area.selectionStart, area.selectionEnd) || 'text'
    setDraft(draft.slice(0, area.selectionStart) + before + selected + after + draft.slice(area.selectionEnd))
  }

  function insertBlock(block: string) {
    const area = ref.current
    if (!area) return
    const start = area.selectionStart
    const prefix = draft.slice(0, start)
    const glue = prefix.length > 0 && !prefix.endsWith('\n\n') ? (prefix.endsWith('\n') ? '\n' : '\n\n') : ''
    setDraft(prefix + glue + block + draft.slice(start))
  }

  async function save() {
    setSaving(true)
    const saved = kind === 'source' ? await libraryService.saveSourceMarkdown(id, draft) : await libraryService.saveKnowledgeMarkdown(id, draft)
    setSaving(false)
    if (saved) navigate(backRoute)
  }

  function startResize(event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault()
    const container = splitRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()

    const resize = (pointerEvent: PointerEvent) => {
      const next = ((pointerEvent.clientX - rect.left) / rect.width) * 100
      setEditorWidth(Math.min(75, Math.max(30, next)))
    }

    const stop = () => {
      window.removeEventListener('pointermove', resize)
      window.removeEventListener('pointerup', stop)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', resize)
    window.addEventListener('pointerup', stop)
  }

  if (missing) {
    return (
      <div className="page-shell-section">
        <Link to={ROUTES.library} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Library</Link>
        <p className="mt-6 text-sm text-muted-foreground">This item is not in your local library.</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3 md:px-6 lg:px-8">
        <Link to={backRoute} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Viewer</Link>
        <div className="min-w-0 flex-1">
          <p className="truncate font-serif text-xl leading-snug tracking-tight">{title}</p>
          <p className="text-xs text-muted-foreground">{kind === 'source' ? 'Source of Truth' : 'Knowledge'} edit mode</p>
        </div>
        <Button onClick={save} disabled={saving} icon={<Save className="h-4 w-4" />}>{saving ? 'Saving' : 'Save'}</Button>
      </div>
      <EditorToolbar view={view} onView={setView} onInsert={insertBlock} onSurround={surround} />
      <div ref={splitRef} className="flex min-h-0 flex-1">
        {view !== 'preview' && <div className={cn('min-w-0 overflow-auto', view !== 'split' && 'flex-1')} style={view === 'split' ? { flexBasis: `${editorWidth}%` } : undefined}><div className="editor-frame"><textarea ref={ref} value={draft} onChange={(event) => setDraft(event.target.value)} spellCheck className="min-h-[65vh] w-full resize-none bg-transparent font-mono text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none" aria-label="Markdown editor" /></div></div>}
        {view === 'split' && <button type="button" onPointerDown={startResize} className="group relative w-3 shrink-0 cursor-col-resize border-x border-border bg-secondary/40 transition hover:bg-accent/60" aria-label="Resize editor and preview panes"><span className="absolute left-1/2 top-1/2 h-10 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-border transition group-hover:bg-primary" /></button>}
        {view !== 'edit' && <div className="min-w-0 flex-1 overflow-auto"><div className="editor-frame"><MarkdownPreview content={draft} /></div></div>}
      </div>
      <div className="flex items-center gap-4 border-t border-border px-4 py-2 text-xs text-muted-foreground"><span className="truncate">{title}</span><span>·</span><span>{words} words</span><span className="ml-auto">Markdown</span></div>
    </div>
  )
}
