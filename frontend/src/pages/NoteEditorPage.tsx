import { ArrowLeft } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { Link } from 'react-router'
import { ROUTES } from '@/constants/routes'
import { EditorToolbar } from '@/features/editor/EditorToolbar'
import { MarkdownPreview } from '@/features/editor/MarkdownPreview'
import { useNoteEditor } from '@/hooks/useNoteEditor'
import { cn } from '@/utils/cn'

export function NoteEditorPage({ noteId }: { noteId: string }) {
  const editor = useNoteEditor(noteId)
  const ref = useRef<HTMLTextAreaElement>(null)
  const splitRef = useRef<HTMLDivElement>(null)
  const [editorWidth, setEditorWidth] = useState(52)

  useEffect(() => editor.applyLoadedNote(), [editor.applyLoadedNote])
  useEffect(() => { void editor.save() }, [editor.draft, editor.save])

  function surround(before: string, after = before) {
    const area = ref.current
    if (!area) return
    const selected = editor.draft.slice(area.selectionStart, area.selectionEnd) || 'text'
    editor.setDraft(editor.draft.slice(0, area.selectionStart) + before + selected + after + editor.draft.slice(area.selectionEnd))
  }

  function insertBlock(block: string) {
    const area = ref.current
    if (!area) return
    const start = area.selectionStart
    const prefix = editor.draft.slice(0, start)
    const glue = prefix.length > 0 && !prefix.endsWith('\n\n') ? (prefix.endsWith('\n') ? '\n' : '\n\n') : ''
    editor.setDraft(prefix + glue + block + editor.draft.slice(start))
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

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <div className="hidden w-64 shrink-0 border-r border-border bg-secondary/40 xl:block">
        <div className="m-5"><Link to={ROUTES.library} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Library</Link><h2 className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Notes</h2></div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <EditorToolbar view={editor.view} onView={editor.setView} onInsert={insertBlock} onSurround={surround} />
        <div ref={splitRef} className="flex min-h-0 flex-1">
          {editor.view !== 'preview' && <div className={cn('min-w-0 overflow-auto', editor.view !== 'split' && 'flex-1')} style={editor.view === 'split' ? { flexBasis: `${editorWidth}%` } : undefined}><div className="editor-frame"><textarea ref={ref} value={editor.draft} onChange={(event) => editor.setDraft(event.target.value)} spellCheck className="min-h-[65vh] w-full resize-none bg-transparent font-mono text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none" aria-label="Markdown editor" /></div></div>}
          {editor.view === 'split' && <button type="button" onPointerDown={startResize} className="group relative w-3 shrink-0 cursor-col-resize border-x border-border bg-secondary/40 transition hover:bg-accent/60" aria-label="Resize editor and preview panes"><span className="absolute left-1/2 top-1/2 h-10 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-border transition group-hover:bg-primary" /></button>}
          {editor.view !== 'edit' && <div className="min-w-0 flex-1 overflow-auto"><div className="editor-frame"><MarkdownPreview content={editor.draft} /></div></div>}
        </div>
        <div className="flex items-center gap-4 border-t border-border px-4 py-2 text-xs text-muted-foreground"><span className="truncate">{editor.title}</span><span>·</span><span>{editor.words} words</span><span className="ml-auto">Saved locally · Markdown</span></div>
      </div>
    </div>
  )
}
