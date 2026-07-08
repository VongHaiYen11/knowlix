import { useCallback, useMemo, useRef, useState } from 'react'
import { libraryService } from '@/services/libraryService'
import { useAsync } from './useAsync'

export type EditorView = 'edit' | 'split' | 'preview'

const emptyNewNote = ''
const defaultExistingDraft = '# Untitled note\n\n'

function hasMeaningfulNoteContent(content: string) {
  return content.replace(/^#\s*Untitled note\s*/i, '').trim().length > 0
}

export function useNoteEditor(noteId: string, onCreated?: (id: string) => void) {
  const isNew = noteId === 'new'
  const generatedId = useRef(isNew ? `note_${crypto.randomUUID()}` : noteId)
  const loader = useCallback(() => (isNew ? Promise.resolve(undefined) : libraryService.getNoteById(noteId)), [isNew, noteId])
  const noteState = useAsync(loader, undefined)
  const [draft, setDraftState] = useState(isNew ? emptyNewNote : defaultExistingDraft)
  const [edited, setEdited] = useState(false)
  const [saving, setSaving] = useState(false)
  const [view, setView] = useState<EditorView>('split')

  const title = useMemo(() => draft.match(/^#\s+(.+)/m)?.[1] ?? 'Untitled note', [draft])
  const words = useMemo(() => draft.trim().split(/\s+/).filter(Boolean).length, [draft])
  const canSave = hasMeaningfulNoteContent(draft)

  const setDraft = useCallback((value: string) => {
    setEdited(true)
    setDraftState(value)
  }, [])

  const applyLoadedNote = useCallback(() => {
    if (noteState.data?.content) {
      setDraftState(noteState.data.content)
      setEdited(false)
    }
  }, [noteState.data])

  const save = useCallback(async () => {
    if (!edited) return
    if (!hasMeaningfulNoteContent(draft)) return
    setSaving(true)
    try {
      const saved = await libraryService.saveNote(isNew ? generatedId.current : noteId, draft)
      setEdited(false)
      if (isNew && saved.id !== 'new') onCreated?.(saved.id)
    } finally {
      setSaving(false)
    }
  }, [draft, edited, isNew, noteId, onCreated])

  return { ...noteState, isNew, draft, setDraft, title, words, view, setView, save, canSave, edited, saving, applyLoadedNote }
}
