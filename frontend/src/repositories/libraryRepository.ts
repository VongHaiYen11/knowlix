import { deleteFromStore, getAllFromStore, getFromStore, putInStore, STORE_NAMES } from '@/repositories/indexedDbClient'
import { apiLibraryRepository } from '@/repositories/apiLibraryRepository'
import { isApiRepositoryEnabled } from '@/repositories/apiClient'
import type { JournalDay, KnowledgeEntry, KnowledgeMergeApplyInput, KnowledgeMergeDraft, KnowledgeMergePreviewInput, NoteItem, Source } from '@/types/knowledge'

export interface LibraryRepository {
  getKnowledge(): Promise<KnowledgeEntry[]>
  getKnowledgeBySlug(slug: string): Promise<KnowledgeEntry | undefined>
  saveKnowledge(entry: KnowledgeEntry): Promise<void>
  previewKnowledgeMerge(input: KnowledgeMergePreviewInput): Promise<KnowledgeMergeDraft>
  applyKnowledgeMerge(input: KnowledgeMergeApplyInput): Promise<KnowledgeEntry>
  getSources(): Promise<Source[]>
  getSourceById(id: string): Promise<Source | undefined>
  saveSource(source: Source): Promise<void>
  deleteSource(id: string): Promise<void>
  getNotes(): Promise<NoteItem[]>
  getNoteById(id: string): Promise<NoteItem | undefined>
  saveNote(note: NoteItem): Promise<NoteItem>
  deleteNote(id: string): Promise<void>
  promoteNoteToSource(id: string): Promise<Source>
  getJournal(): Promise<JournalDay[]>
  appendJournalEntry(date: string, entry: { time: string; text: string; tags: string[] }): Promise<JournalDay>
}

export const indexedDbLibraryRepository: LibraryRepository = {
  getKnowledge: () => getAllFromStore(STORE_NAMES.knowledge),
  getKnowledgeBySlug: (slug) => getFromStore(STORE_NAMES.knowledge, slug),
  saveKnowledge: (entry) => putInStore(STORE_NAMES.knowledge, entry),
  previewKnowledgeMerge: async () => {
    throw new Error('Merge requires API mode. Set VITE_API_URL in frontend/.env.local.')
  },
  applyKnowledgeMerge: async () => {
    throw new Error('Merge requires API mode. Set VITE_API_URL in frontend/.env.local.')
  },
  getSources: () => getAllFromStore(STORE_NAMES.sources),
  getSourceById: async (id) => {
    const source = await getFromStore(STORE_NAMES.sources, id)
    if (source) return source
    const all = await getAllFromStore(STORE_NAMES.sources)
    return all.find(s => s.fileId === id)
  },
  saveSource: (source) => putInStore(STORE_NAMES.sources, source),
  deleteSource: async (id) => {
    const source = await indexedDbLibraryRepository.getSourceById(id)
    const knowledge = await indexedDbLibraryRepository.getKnowledge()
    const relatedEntries = knowledge.filter(entry => 
      entry.sources?.some(s => s.id === id) || 
      (entry as any).sourceList?.some((s: any) => s.id === id)
    )

    for (const entry of relatedEntries) {
      const nextSources = (entry.sources ?? []).filter((item) => item.id !== id)
      if (nextSources.length === 0) {
        await deleteFromStore(STORE_NAMES.knowledge, entry.slug)
      } else {
        await putInStore(STORE_NAMES.knowledge, {
          ...entry,
          sources: nextSources,
          references: (entry.references ?? []).filter((item) => item.label !== source?.title && item.source !== source?.rawStorageObjectId),
          timeline: (entry.timeline ?? []).filter((item) => !item.event.includes(source?.title ?? '')),
        })
      }
    }

    await deleteFromStore(STORE_NAMES.sources, id)
  },
  getNotes: () => getAllFromStore(STORE_NAMES.notes),
  getNoteById: (id) => getFromStore(STORE_NAMES.notes, id),
  saveNote: async (note) => {
    await putInStore(STORE_NAMES.notes, note)
    return note
  },
  deleteNote: (id) => deleteFromStore(STORE_NAMES.notes, id),
  promoteNoteToSource: async (id) => {
    const note = await indexedDbLibraryRepository.getNoteById(id)
    if (!note) throw new Error('Note not found')
    const source: Source = {
      id: `source_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: 'Markdown',
      title: note.title,
      content: note.content,
      tags: [],
      category: 'Uncategorized',
      created: 'Today',
      status: 'Processing',
      meta: 'Promoted note',
      excerpt: note.excerpt,
    }
    await putInStore(STORE_NAMES.sources, source)
    await deleteFromStore(STORE_NAMES.notes, id)
    return source
  },
  getJournal: () => getAllFromStore(STORE_NAMES.journal),
  appendJournalEntry: async (date, entry) => {
    const existing = await getFromStore(STORE_NAMES.journal, date)
    const day: JournalDay = {
      date,
      weekday: new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date(`${date}T00:00:00`)),
      entries: [
        ...(existing?.entries ?? []),
        {
          id: `journal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          ...entry,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    }
    await putInStore(STORE_NAMES.journal, day)
    return day
  },
}

export const libraryRepository: LibraryRepository = isApiRepositoryEnabled ? apiLibraryRepository : indexedDbLibraryRepository
