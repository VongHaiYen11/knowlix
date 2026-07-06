import { ArrowLeft } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { ROUTES } from '@/constants/routes'
import { EditorToolbar } from '@/features/editor/EditorToolbar'
import { MarkdownPreview } from '@/features/editor/MarkdownPreview'
import { useNoteEditor } from '@/hooks/useNoteEditor'
import { cn } from '@/utils/cn'

export function NoteEditorPage({ noteId }: { noteId: string }) {
  const editor = useNoteEditor(noteId)
  const ref = useRef<HTMLTextAreaElement>(null)

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

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <div className="hidden w-64 shrink-0 border-r border-border bg-secondary/40 xl:block">
        <div className="m-5"><Link to={ROUTES.library} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Library</Link><h2 className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Notes</h2></div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <EditorToolbar view={editor.view} onView={editor.setView} onInsert={insertBlock} onSurround={surround} />
        <div className="flex min-h-0 flex-1">
          {editor.view !== 'preview' && <div className={cn('min-w-0 flex-1 overflow-auto', editor.view === 'split' && 'border-r border-border')}><div className="editor-frame"><textarea ref={ref} value={editor.draft} onChange={(event) => editor.setDraft(event.target.value)} spellCheck className="min-h-[65vh] w-full resize-none bg-transparent font-mono text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none" aria-label="Markdown editor" /></div></div>}
          {editor.view !== 'edit' && <div className="min-w-0 flex-1 overflow-auto"><div className="editor-frame"><MarkdownPreview content={editor.draft} /></div></div>}
        </div>
        <div className="flex items-center gap-4 border-t border-border px-4 py-2 text-xs text-muted-foreground"><span className="truncate">{editor.title}</span><span>·</span><span>{editor.words} words</span><span className="ml-auto">Saved locally · Markdown</span></div>
      </div>
    </div>
  )
}
