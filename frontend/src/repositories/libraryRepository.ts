import { apiLibraryRepository } from '@/repositories/apiLibraryRepository'
import type { JournalDay, KnowledgeEntry, KnowledgeMergeApplyInput, KnowledgeMergeDraft, KnowledgeMergePreviewInput, NoteItem, Source } from '@/types/knowledge'

export interface LibraryRepository {
  getKnowledge(): Promise<KnowledgeEntry[]>
  getKnowledgeBySlug(slug: string): Promise<KnowledgeEntry | undefined>
  saveKnowledge(entry: KnowledgeEntry): Promise<void>
  regenerateKnowledge(slug: string): Promise<KnowledgeEntry>
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

export const libraryRepository: LibraryRepository = apiLibraryRepository
