import { useCallback } from 'react'
import { libraryService, type LibraryFilters } from '@/services/libraryService'
import type { KnowledgeEntry, Source } from '@/types/knowledge'
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

export function useKnowledgeArticle(slug: string) {
  const loader = useCallback(() => libraryService.getKnowledgeBySlug(slug), [slug])
  return useAsync(loader, undefined)
}

export function useSourceArticle(id: string) {
  const loader = useCallback(() => libraryService.getSourceById(id), [id])
  return useAsync(loader, undefined)
}

export function useJournal() {
  const loader = useCallback(() => libraryService.getJournal(), [])
  return useAsync(loader, [])
}

export function useGraphData() {
  const loader = useCallback(() => libraryService.getGraph(), [])
  return useAsync(loader, { nodes: [], links: [] })
}

export function useTaxonomy() {
  return libraryService.getTaxonomy()
}
