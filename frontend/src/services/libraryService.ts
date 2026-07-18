import { apiClient, isApiRepositoryEnabled } from '@/repositories/apiClient'
import { libraryRepository, type LibraryRepository } from '@/repositories/libraryRepository'
import type { JournalDay, KnowledgeEntry, KnowledgeMergeApplyInput, KnowledgeMergeDraft, KnowledgeMergePreviewInput, NoteItem, Source, SourceType } from '@/types/knowledge'
import { vietnamDateString, vietnamTimeString } from '@/utils/vietnamTime'

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

function cleanTags(tags: string[]) {
  return Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean)))
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

  previewKnowledgeMerge(input: KnowledgeMergePreviewInput): Promise<KnowledgeMergeDraft> {
    return this.repository.previewKnowledgeMerge(input)
  }

  applyKnowledgeMerge(input: KnowledgeMergeApplyInput): Promise<KnowledgeEntry> {
    return this.repository.applyKnowledgeMerge(input)
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

  async getNotes(filters: Pick<LibraryFilters, 'query' | 'sort'> = {}): Promise<NoteItem[]> {
    const notes = await this.repository.getNotes()
    const filtered = notes.filter((note) => includesQuery([note.title, note.excerpt], filters.query ?? ''))
    return sortByFilter(filtered, filters.sort)
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
    return this.repository.saveNote(note)
  }

  promoteNoteToSource(id: string): Promise<Source> {
    return this.repository.promoteNoteToSource(id)
  }

  getJournal(): Promise<JournalDay[]> {
    return this.repository.getJournal().then((days) => [...days].sort((a, b) => b.date.localeCompare(a.date)))
  }

  appendJournalEntry(input: { text: string; tags: string[] }): Promise<JournalDay> {
    return this.repository.appendJournalEntry(vietnamDateString(), {
      time: vietnamTimeString(),
      text: input.text.trim(),
      tags: cleanTags(input.tags),
    })
  }

  async getTaxonomy(): Promise<{ tags: string[]; categories: string[] }> {
    const [sources, knowledge] = await Promise.all([this.repository.getSources(), this.repository.getKnowledge()])
    const tags = Array.from(new Set([...sources.flatMap((source) => source.tags), ...knowledge.flatMap((entry) => entry.tags)].filter(Boolean))).sort()
    const categories = Array.from(new Set([...sources.map((source) => source.category), ...knowledge.map((entry) => entry.category)].filter(Boolean))).sort()
    return { tags, categories }
  }

  async uploadSources(files: File[]): Promise<void> {
    if (!isApiRepositoryEnabled) {
      throw new Error('Upload requires API mode. Set VITE_API_URL in frontend/.env.local.')
    }

    await Promise.all(
      files.map((file) => {
        const formData = new FormData()
        formData.append('file', file)
        return apiClient.postForm('/api/v1/sources/upload', formData)
      }),
    )
  }

  deleteSource(id: string): Promise<void> {
    return this.repository.deleteSource(id)
  }
}

export const libraryService = new LibraryService()
