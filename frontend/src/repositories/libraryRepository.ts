import { getAllFromStore, getFromStore, putInStore, STORE_NAMES } from '@/repositories/indexedDbClient'
import type { GraphLink, GraphNode, JournalDay, KnowledgeEntry, NoteItem, Source } from '@/types/knowledge'

export interface LibraryRepository {
  getKnowledge(): Promise<KnowledgeEntry[]>
  getKnowledgeBySlug(slug: string): Promise<KnowledgeEntry | undefined>
  saveKnowledge(entry: KnowledgeEntry): Promise<void>
  getSources(): Promise<Source[]>
  getSourceById(id: string): Promise<Source | undefined>
  saveSource(source: Source): Promise<void>
  getNotes(): Promise<NoteItem[]>
  getNoteById(id: string): Promise<NoteItem | undefined>
  saveNote(note: NoteItem): Promise<void>
  getJournal(): Promise<JournalDay[]>
  getGraphNodes(): Promise<GraphNode[]>
  getGraphLinks(): Promise<GraphLink[]>
}

export const indexedDbLibraryRepository: LibraryRepository = {
  getKnowledge: () => getAllFromStore(STORE_NAMES.knowledge),
  getKnowledgeBySlug: (slug) => getFromStore(STORE_NAMES.knowledge, slug),
  saveKnowledge: (entry) => putInStore(STORE_NAMES.knowledge, entry),
  getSources: () => getAllFromStore(STORE_NAMES.sources),
  getSourceById: (id) => getFromStore(STORE_NAMES.sources, id),
  saveSource: (source) => putInStore(STORE_NAMES.sources, source),
  getNotes: () => getAllFromStore(STORE_NAMES.notes),
  getNoteById: (id) => getFromStore(STORE_NAMES.notes, id),
  saveNote: (note) => putInStore(STORE_NAMES.notes, note),
  getJournal: () => getAllFromStore(STORE_NAMES.journal),
  getGraphNodes: () => getAllFromStore(STORE_NAMES.graphNodes),
  getGraphLinks: async () => {
    const stored = await getAllFromStore(STORE_NAMES.graphLinks)
    return stored.map(({ source, target }) => ({ source, target }))
  },
}
