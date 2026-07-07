import { deleteFromStore, getAllFromStore, getFromStore, putInStore, STORE_NAMES } from '@/repositories/indexedDbClient'
import { apiLibraryRepository } from '@/repositories/apiLibraryRepository'
import { isApiRepositoryEnabled } from '@/repositories/apiClient'
import type { GraphLink, GraphNode, JournalDay, KnowledgeEntry, NoteItem, Source } from '@/types/knowledge'

export interface LibraryRepository {
  getKnowledge(): Promise<KnowledgeEntry[]>
  getKnowledgeBySlug(slug: string): Promise<KnowledgeEntry | undefined>
  saveKnowledge(entry: KnowledgeEntry): Promise<void>
  getSources(): Promise<Source[]>
  getSourceById(id: string): Promise<Source | undefined>
  saveSource(source: Source): Promise<void>
  deleteSource(id: string): Promise<void>
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
  getSourceById: async (id) => {
    const source = await getFromStore(STORE_NAMES.sources, id)
    if (source) return source
    const all = await getAllFromStore(STORE_NAMES.sources)
    return all.find(s => s.fileId === id)
  },
  saveSource: (source) => putInStore(STORE_NAMES.sources, source),
  deleteSource: async (id) => {
    const knowledge = await indexedDbLibraryRepository.getKnowledge()
    const relatedEntries = knowledge.filter(entry => 
      entry.sources?.some(s => s.id === id) || 
      (entry as any).sourceList?.some((s: any) => s.id === id)
    )
    const slugs = relatedEntries.map(e => e.slug)
    
    if (slugs.length > 0) {
      const links = await getAllFromStore(STORE_NAMES.graphLinks)
      const nodes = await getAllFromStore(STORE_NAMES.graphNodes)
      
      for (const link of links) {
        if (slugs.includes(link.source) || slugs.includes(link.target)) {
          await deleteFromStore(STORE_NAMES.graphLinks, link.id)
        }
      }
      for (const node of nodes) {
        if (slugs.includes(node.id)) {
          await deleteFromStore(STORE_NAMES.graphNodes, node.id)
        }
      }
      for (const slug of slugs) {
        await deleteFromStore(STORE_NAMES.knowledge, slug)
      }

      // Cleanup graph links and nodes that are now orphaned/placeholder only
      const updatedKnowledge = await indexedDbLibraryRepository.getKnowledge()
      const activeSlugs = updatedKnowledge.map(e => e.slug)
      const currentLinks = await getAllFromStore(STORE_NAMES.graphLinks)
      const currentNodes = await getAllFromStore(STORE_NAMES.graphNodes)

      // Delete links that connect two placeholder nodes (neither is in activeSlugs)
      for (const link of currentLinks) {
        if (!activeSlugs.includes(link.source) && !activeSlugs.includes(link.target)) {
          await deleteFromStore(STORE_NAMES.graphLinks, link.id)
        }
      }

      // Re-fetch remaining links to check remaining node connections
      const remainingLinks = await getAllFromStore(STORE_NAMES.graphLinks)
      const connectedSlugs = new Set<string>()
      remainingLinks.forEach(link => {
        connectedSlugs.add(link.source)
        connectedSlugs.add(link.target)
      })

      // Delete nodes that have no page and no active connections
      for (const node of currentNodes) {
        if (!activeSlugs.includes(node.id) && !connectedSlugs.has(node.id)) {
          await deleteFromStore(STORE_NAMES.graphNodes, node.id)
        }
      }
    }
    
    await deleteFromStore(STORE_NAMES.sources, id)
  },
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

export const libraryRepository: LibraryRepository = isApiRepositoryEnabled ? apiLibraryRepository : indexedDbLibraryRepository
