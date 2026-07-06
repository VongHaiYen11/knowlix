import { useCallback, useEffect, useState } from 'react'
import { researchService, type ResearchMessage, type ResearchScope, type ResearchThread } from '@/services/researchService'
import type { KnowledgeEntry } from '@/types/knowledge'

const storageKey = 'knowlix.researchThreads'
const defaultDateRange = 'Anytime'
const defaultScope: ResearchScope = { tags: [], categories: [], dateRange: defaultDateRange }
const seedMessages: ResearchMessage[] = [
  { id: 'seed-u', role: 'user', content: 'What do I actually know about how memory works?' },
  { id: 'seed-a', role: 'assistant', content: 'Across your knowledge pages, three ideas form a coherent picture: memory decays, retrieval strengthens it, and spaced repetition operationalizes both.' },
]

const createThread = (title = 'Untitled research'): ResearchThread => {
  const now = new Date().toISOString()
  return {
    id: `thread-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    messages: seedMessages,
    scope: defaultScope,
    createdAt: now,
    updatedAt: now,
  }
}

const loadThreads = (): ResearchThread[] => {
  try {
    const stored = localStorage.getItem(storageKey)
    if (!stored) return [createThread('Memory research')]
    const parsed = JSON.parse(stored) as ResearchThread[]
    if (!Array.isArray(parsed) || !parsed.length) return [createThread('Memory research')]
    return parsed.map((thread) => ({
      ...thread,
      scope: {
        ...thread.scope,
        dateRange: thread.scope.dateRange === 'Any time' ? defaultDateRange : thread.scope.dateRange,
      },
    }))
  } catch {
    return [createThread('Memory research')]
  }
}

export function useResearch(initialQuestion: string) {
  const [threads, setThreads] = useState<ResearchThread[]>(loadThreads)
  const [activeThreadId, setActiveThreadId] = useState(() => threads[0]?.id ?? '')
  const [input, setInput] = useState(initialQuestion)
  const [scopedKnowledge, setScopedKnowledge] = useState<KnowledgeEntry[]>([])
  const activeThread = threads.find((thread) => thread.id === activeThreadId) ?? threads[0]
  const messages = activeThread?.messages ?? seedMessages
  const scope = activeThread?.scope ?? defaultScope

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(threads))
  }, [threads])

  useEffect(() => {
    void researchService.getScopedKnowledge(scope).then(setScopedKnowledge)
  }, [scope])

  const updateActiveThread = useCallback((updater: (thread: ResearchThread) => ResearchThread) => {
    setThreads((current) => current.map((thread) => (
      thread.id === activeThreadId ? { ...updater(thread), updatedAt: new Date().toISOString() } : thread
    )))
  }, [activeThreadId])

  const send = useCallback(() => {
    const question = input.trim()
    if (!question) return
    updateActiveThread((thread) => ({
      ...thread,
      title: thread.title === 'Untitled research' ? question.slice(0, 56) : thread.title,
      messages: [
        ...thread.messages,
        researchService.buildUserMessage(question),
        researchService.buildAssistantReply(question, scopedKnowledge.length),
      ],
    }))
    setInput('')
  }, [input, scopedKnowledge.length, updateActiveThread])

  const reset = useCallback(() => {
    const thread = createThread()
    setThreads((current) => [thread, ...current])
    setActiveThreadId(thread.id)
    setInput('')
  }, [])

  const setScope = useCallback((nextScope: ResearchScope) => {
    updateActiveThread((thread) => ({ ...thread, scope: nextScope }))
  }, [updateActiveThread])

  const renameThread = useCallback((title: string) => {
    updateActiveThread((thread) => ({ ...thread, title }))
  }, [updateActiveThread])

  const selectThread = useCallback((id: string) => {
    setActiveThreadId(id)
    setInput('')
  }, [])

  return {
    activeThread,
    threads,
    messages,
    input,
    setInput,
    scope,
    setScope,
    scopedKnowledge,
    send,
    reset,
    renameThread,
    selectThread,
  }
}
