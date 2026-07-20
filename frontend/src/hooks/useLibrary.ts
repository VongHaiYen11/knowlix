import { useCallback } from 'react'
import { libraryService, type LibraryFilters } from '@/services/libraryService'
import type { KnowledgeEntry, NoteItem, Source } from '@/types/knowledge'
import { useAsync } from './useAsync'

export function useHomeData() {
  const loader = useCallback(() => libraryService.getHomeData(), [])
  return useAsync(loader, { knowledge: [], notes: [], journal: [] })
}

export function useLibrarySources(filters: LibraryFilters) {
  const loader = useCallback<() => Promise<Source[]>>(() => libraryService.getSources(filters), [filters])
  return useAsync(loader, [])
}

export function useLibraryKnowledge(filters: LibraryFilters) {
  const loader = useCallback<() => Promise<KnowledgeEntry[]>>(() => libraryService.getKnowledge(filters), [filters])
  return useAsync(loader, [])
}

export function useLibraryNotes(filters: Pick<LibraryFilters, 'query' | 'sort'>) {
  const loader = useCallback<() => Promise<NoteItem[]>>(() => libraryService.getNotes(filters), [filters])
  return useAsync(loader, [])
}

export function useKnowledgeArticle(slug: string) {
  const loader = useCallback(() => libraryService.getKnowledgeBySlug(slug), [slug])
  const state = useAsync(loader, undefined)
  const { setData } = state
  const regenerate = useCallback(async () => {
    const entry = await libraryService.regenerateKnowledge(slug)
    setData(entry)
    return entry
  }, [slug, setData])
  return { ...state, regenerate }
}

export function useSourceArticle(id: string) {
  const loader = useCallback(() => libraryService.getSourceById(id), [id])
  return useAsync(loader, undefined)
}

export function useJournal() {
  const loader = useCallback(() => libraryService.getJournal(), [])
  return useAsync(loader, [])
}

export function useTaxonomy() {
  const loader = useCallback(() => libraryService.getTaxonomy(), [])
  return useAsync(loader, { tags: [], categories: [] })
}
