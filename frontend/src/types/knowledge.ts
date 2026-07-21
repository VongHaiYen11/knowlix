export type SourceType = 'PDF' | 'DOCX' | 'TXT' | 'Markdown'
export type ProcessingStatus = 'Processed' | 'Processing' | 'Queued'

export interface KnowledgeSource {
  id: string
  type: SourceType
  title: string
}

export interface KnowledgeTimelineItem {
  date: string
  occurredAt?: string
  event: string
}

export interface KnowledgeEntry {
  slug: string
  title: string
  content?: string
  contentUrl?: string
  markdownStorageObjectId?: string
  overview: string
  category: string
  tags: string[]
  knowledgeTags?: string[]
  created: string
  updated: string
  readTime: string
  keyIdeas: string[]
  explanation: string[]
  examples: Array<{ title: string; body: string }>
  related: Array<{ slug: string; title: string }>
  references: Array<{ label: string; source: string }>
  sources: KnowledgeSource[]
  timeline: KnowledgeTimelineItem[]
}

export type KnowledgeMergeMode = 'automatic' | 'manual'
export type KnowledgeMergeStyle = 'balanced' | 'bullet' | 'paragraph' | 'course_notes'

export interface KnowledgeMergePreviewInput {
  sourceSlugs: string[]
  mode: KnowledgeMergeMode
  targetTitle?: string
  context?: string
  style?: KnowledgeMergeStyle
}

export interface KnowledgeMergeDraft {
  title: string
  slug: string
  overview: string
  category: string
  tags: string[]
  content: string
  sources: KnowledgeSource[]
  related: Array<{ slug: string; title: string }>
  references: Array<{ label: string; source: string }>
  timeline: KnowledgeTimelineItem[]
  reason?: string
}

export interface KnowledgeMergeApplyInput {
  sourceSlugs: string[]
  draft: KnowledgeMergeDraft
}

export interface Source {
  id: string
  type: SourceType
  title: string
  content?: string
  contentUrl?: string
  rawStorageObjectId?: string
  extractedStorageObjectId?: string
  summaryStorageObjectId?: string
  tags: string[]
  knowledgeTags?: string[]
  category: string
  created: string
  status: ProcessingStatus
  meta: string
  excerpt: string
  fileId?: string
}

export interface NoteItem {
  id: string
  title: string
  excerpt: string
  updated: string
  words: number
  content: string
  contentUrl?: string
  storageObjectId?: string
}

export interface JournalEntry {
  id: string
  time: string
  text: string
  tags: string[]
  createdAt?: string
  updatedAt?: string
}

export interface JournalDay {
  date: string
  weekday: string
  entries: JournalEntry[]
}

export interface LibrarySearchResult {
  id: string
  kind: 'Knowledge' | 'Note' | 'Journal' | SourceType
  title: string
  snippet: string
  meta: string
}
