import { apiClient, getAllPages } from '@/repositories/apiClient'
import type { LibraryRepository } from '@/repositories/libraryRepository'
import type { GraphLink, GraphNode, JournalDay, KnowledgeEntry, NoteItem, Source } from '@/types/knowledge'

export const apiLibraryRepository: LibraryRepository = {
  getKnowledge: () => getAllPages<KnowledgeEntry>('/api/v1/knowledge'),
  getKnowledgeBySlug: async (slug) => {
    try {
      const entry = await apiClient.get<KnowledgeEntry>(`/api/v1/knowledge/${encodeURIComponent(slug)}`)
      if (entry.contentUrl) {
        entry.content = await apiClient.text(entry.contentUrl)
      }
      return entry
    } catch {
      return undefined
    }
  },
  saveKnowledge: async (entry) => {
    const existing = await apiLibraryRepository.getKnowledgeBySlug(entry.slug)
    if (existing) {
      await apiClient.post<KnowledgeEntry>(`/api/v1/knowledge/${encodeURIComponent(entry.slug)}/proposals`, entry)
      return
    }
    await apiClient.post<KnowledgeEntry>('/api/v1/knowledge', entry)
  },
  getSources: () => getAllPages<Source>('/api/v1/sources'),
  getSourceById: async (id) => {
    try {
      const source = await apiClient.get<Source>(`/api/v1/sources/${encodeURIComponent(id)}`)
      if (source.contentUrl) {
        source.content = await apiClient.text(source.contentUrl)
      }
      return source
    } catch {
      return undefined
    }
  },
  saveSource: async (source) => {
    const existing = await apiLibraryRepository.getSourceById(source.id)
    if (existing) {
      await apiClient.patch<Source>(`/api/v1/sources/${encodeURIComponent(source.id)}`, source)
      return
    }
    await apiClient.post<Source>('/api/v1/sources', source)
  },
  deleteSource: (id) => apiClient.delete<void>(`/api/v1/sources/${encodeURIComponent(id)}`),
  getNotes: () => getAllPages<NoteItem>('/api/v1/notes'),
  getNoteById: async (id) => {
    try {
      const note = await apiClient.get<NoteItem>(`/api/v1/notes/${encodeURIComponent(id)}`)
      if (note.contentUrl) {
        note.content = await apiClient.text(note.contentUrl)
      }
      return note
    } catch {
      return undefined
    }
  },
  saveNote: async (note) => {
    const existing = await apiLibraryRepository.getNoteById(note.id)
    if (existing) {
      await apiClient.patch<NoteItem>(`/api/v1/notes/${encodeURIComponent(note.id)}`, note)
      return
    }
    await apiClient.post<NoteItem>('/api/v1/notes', note)
  },
  getJournal: () => getAllPages<JournalDay>('/api/v1/journal'),
  getGraphNodes: async () => {
    const graph = await apiClient.get<{ nodes: GraphNode[]; links: GraphLink[] }>('/api/v1/graph')
    return graph.nodes
  },
  getGraphLinks: async () => {
    const graph = await apiClient.get<{ nodes: GraphNode[]; links: GraphLink[] }>('/api/v1/graph')
    return graph.links
  },
}
