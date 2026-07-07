import { allCategories, allTags } from '@/constants/sampleData'
import { libraryRepository, type LibraryRepository } from '@/repositories/libraryRepository'
import type { GraphLink, GraphNode, JournalDay, KnowledgeEntry, NoteItem, Source, SourceType } from '@/types/knowledge'

export interface LibraryFilters {
  query?: string
  sourceType?: SourceType | 'All'
  category?: string
  tag?: string
  sort?: 'updated-desc' | 'created-desc' | 'title-asc' | 'type-asc'
}

function includesQuery(values: string[], query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return values.some((value) => value.toLowerCase().includes(q))
}

function sortByFilter<T extends { title: string; created?: string; updated?: string; type?: string }>(items: T[], sort: LibraryFilters['sort'] = 'updated-desc'): T[] {
  return [...items].sort((a, b) => {
    if (sort === 'title-asc') return a.title.localeCompare(b.title)
    if (sort === 'type-asc') return (a.type ?? '').localeCompare(b.type ?? '') || a.title.localeCompare(b.title)
    if (sort === 'created-desc') return (b.created ?? '').localeCompare(a.created ?? '')
    return (b.updated ?? b.created ?? '').localeCompare(a.updated ?? a.created ?? '')
  })
}

function titleFromMarkdown(content: string, fallback: string): string {
  return content.match(/^#\s+(.+)/m)?.[1]?.trim() || fallback
}

function plainExcerpt(content: string): string {
  return content.replace(/```[\s\S]*?```/g, '').replace(/[#*_>`|[\]-]/g, '').trim().slice(0, 180)
}

export class LibraryService {
  constructor(private readonly repository: LibraryRepository = libraryRepository) {}

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
    const filtered = sources.filter((source) => {
      if (filters.sourceType && filters.sourceType !== 'All' && source.type !== filters.sourceType) return false
      if (filters.category && filters.category !== 'All' && source.category !== filters.category) return false
      if (filters.tag && filters.tag !== 'All' && !source.tags.includes(filters.tag)) return false
      return includesQuery([source.title, source.excerpt, ...source.tags], filters.query ?? '')
    })
    return sortByFilter(filtered, filters.sort)
  }

  async getKnowledge(filters: LibraryFilters = {}): Promise<KnowledgeEntry[]> {
    const knowledge = await this.repository.getKnowledge()
    const filtered = knowledge.filter((entry) => {
      if (filters.category && filters.category !== 'All' && entry.category !== filters.category) return false
      if (filters.tag && filters.tag !== 'All' && !entry.tags.includes(filters.tag)) return false
      return includesQuery([entry.title, entry.overview, ...entry.tags], filters.query ?? '')
    })
    return sortByFilter(filtered, filters.sort)
  }

  getKnowledgeBySlug(slug: string): Promise<KnowledgeEntry | undefined> {
    return this.repository.getKnowledgeBySlug(slug)
  }

  getSourceById(id: string): Promise<Source | undefined> {
    return this.repository.getSourceById(id)
  }

  sourceToMarkdown(source: Source): string {
    if (source.content) return source.content
    return `# ${source.title}

${source.excerpt}

## Details

- Type: ${source.type}
- Category: ${source.category}
- Status: ${source.status}
- Meta: ${source.meta}
- Created: ${source.created}
`
  }

  knowledgeToMarkdown(entry: KnowledgeEntry): string {
    if (entry.content) return entry.content
    return `# ${entry.title}

${entry.overview}

## Key ideas

${entry.keyIdeas.map((idea) => `- ${idea}`).join('\n')}

## Explanation

${entry.explanation.join('\n\n')}
`
  }

  async saveSourceMarkdown(id: string, content: string): Promise<Source | undefined> {
    const source = await this.repository.getSourceById(id)
    if (!source) return undefined
    const next: Source = {
      ...source,
      title: titleFromMarkdown(content, source.title),
      excerpt: plainExcerpt(content),
      content,
      status: 'Processed',
    }
    await this.repository.saveSource(next)
    return next
  }

  async saveKnowledgeMarkdown(slug: string, content: string): Promise<KnowledgeEntry | undefined> {
    const entry = await this.repository.getKnowledgeBySlug(slug)
    if (!entry) return undefined
    const body = plainExcerpt(content)
    const next: KnowledgeEntry = {
      ...entry,
      title: titleFromMarkdown(content, entry.title),
      overview: body || entry.overview,
      content,
      updated: 'Saved just now',
    }
    await this.repository.saveKnowledge(next)
    return next
  }

  async saveSourceTags(id: string, tags: string[]): Promise<Source | undefined> {
    const source = await this.repository.getSourceById(id)
    if (!source) return undefined
    const next = { ...source, tags: Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean))) }
    await this.repository.saveSource(next)
    return next
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
