import { useCallback, useMemo, useState } from 'react'
import { libraryService } from '@/services/libraryService'
import { useAsync } from './useAsync'

export type EditorView = 'edit' | 'split' | 'preview'

export function useNoteEditor(noteId: string) {
  const isNew = noteId === 'new'
  const loader = useCallback(() => (isNew ? Promise.resolve(undefined) : libraryService.getNoteById(noteId)), [isNew, noteId])
  const noteState = useAsync(loader, undefined)
  const [draft, setDraft] = useState('# Untitled note\n\n')
  const [view, setView] = useState<EditorView>('split')

  const title = useMemo(() => draft.match(/^#\s+(.+)/m)?.[1] ?? 'Untitled note', [draft])
  const words = useMemo(() => draft.trim().split(/\s+/).filter(Boolean).length, [draft])

  const applyLoadedNote = useCallback(() => {
    if (noteState.data?.content) setDraft(noteState.data.content)
  }, [noteState.data])

  const save = useCallback(async () => {
    await libraryService.saveNote(noteId, draft)
  }, [draft, noteId])

  return { ...noteState, isNew, draft, setDraft, title, words, view, setView, save, applyLoadedNote }
}
