import { allCategories, allTags } from '@/constants/sampleData'
import { indexedDbLibraryRepository, type LibraryRepository } from '@/repositories/libraryRepository'
import type { GraphLink, GraphNode, JournalDay, KnowledgeEntry, NoteItem, Source, SourceType } from '@/types/knowledge'

export interface LibraryFilters {
  query?: string
  sourceType?: SourceType | 'All'
  category?: string
}

function includesQuery(values: string[], query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return values.some((value) => value.toLowerCase().includes(q))
}

export class LibraryService {
  constructor(private readonly repository: LibraryRepository = indexedDbLibraryRepository) {}

  async getHomeData(): Promise<{ knowledge: KnowledgeEntry[]; notes: NoteItem[]; journal: JournalDay[] }> {
    const [knowledge, notes, journal] = await Promise.all([
      this.repository.getKnowledge(),
      this.repository.getNotes(),
      this.repository.getJournal(),
    ])
    return { knowledge, notes, journal }
  }

  async getSources(filters: LibraryFilters = {}): Promise<Source[]> {
    const sources = await this.repository.getSources()
    return sources.filter((source) => {
      if (filters.sourceType && filters.sourceType !== 'All' && source.type !== filters.sourceType) return false
      return includesQuery([source.title, source.excerpt, ...source.tags], filters.query ?? '')
    })
  }

  async getKnowledge(filters: LibraryFilters = {}): Promise<KnowledgeEntry[]> {
    const knowledge = await this.repository.getKnowledge()
    return knowledge.filter((entry) => {
      if (filters.category && filters.category !== 'All' && entry.category !== filters.category) return false
      return includesQuery([entry.title, entry.overview, ...entry.tags], filters.query ?? '')
    })
  }

  getKnowledgeBySlug(slug: string): Promise<KnowledgeEntry | undefined> {
    return this.repository.getKnowledgeBySlug(slug)
  }

  getNoteById(id: string): Promise<NoteItem | undefined> {
    return this.repository.getNoteById(id)
  }

  async saveNote(id: string, content: string): Promise<NoteItem> {
    const title = content.match(/^#\s+(.+)/m)?.[1] ?? 'Untitled note'
    const words = content.trim().split(/\s+/).filter(Boolean).length
    const note: NoteItem = {
      id,
      title,
      excerpt: content.replace(/[#*_>`-]/g, '').trim().slice(0, 120),
      updated: 'Saved just now',
      words,
      content,
    }
    await this.repository.saveNote(note)
    return note
  }

  async getGraph(): Promise<{ nodes: GraphNode[]; links: GraphLink[] }> {
    const [nodes, links] = await Promise.all([this.repository.getGraphNodes(), this.repository.getGraphLinks()])
    return { nodes, links }
  }

  getJournal(): Promise<JournalDay[]> {
    return this.repository.getJournal()
  }

  getTaxonomy(): { tags: string[]; categories: string[] } {
    return { tags: allTags, categories: allCategories }
  }
}

export const libraryService = new LibraryService()
