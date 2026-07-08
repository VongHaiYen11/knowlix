export type SourceType = 'PDF' | 'DOCX' | 'TXT' | 'Markdown'
export type ProcessingStatus = 'Processed' | 'Processing' | 'Queued'

export interface KnowledgeSource {
  id: string
  type: SourceType
  title: string
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
  workspaceLabels?: string[]
  created: string
  updated: string
  readTime: string
  keyIdeas: string[]
  explanation: string[]
  examples: Array<{ title: string; body: string }>
  related: Array<{ slug: string; title: string }>
  references: Array<{ label: string; source: string }>
  sources: KnowledgeSource[]
  timeline: Array<{ date: string; event: string }>
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
  workspaceLabels?: string[]
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
  time: string
  kind: string
  text: string
}

export interface JournalDay {
  date: string
  weekday: string
  summary: string
  entries: JournalEntry[]
  learnings: string[]
  connections: string[]
}

export interface GraphNode {
  id: string
  label: string
  category: string
  tags: string[]
  x: number
  y: number
}

export interface GraphLink {
  source: string
  target: string
}

export interface LibrarySearchResult {
  id: string
  kind: 'Knowledge' | 'Note' | 'Journal' | SourceType
  title: string
  snippet: string
  meta: string
}
