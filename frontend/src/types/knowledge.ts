export type SourceType = 'Note' | 'PDF' | 'Article' | 'Bookmark' | 'Image' | 'Voice' | 'File'
export type ProcessingStatus = 'Processed' | 'Processing' | 'Queued'

export interface KnowledgeSource {
  id: string
  type: SourceType
  title: string
}

export interface KnowledgeEntry {
  slug: string
  title: string
  overview: string
  category: string
  tags: string[]
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
  tags: string[]
  category: string
  created: string
  status: ProcessingStatus
  meta: string
  excerpt: string
}

export interface NoteItem {
  id: string
  title: string
  excerpt: string
  updated: string
  words: number
  content: string
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
  kind: 'Knowledge' | 'Note' | 'Journal' | 'PDF' | 'Bookmark'
  title: string
  snippet: string
  meta: string
}
