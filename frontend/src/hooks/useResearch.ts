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

  const send = useCallback(async () => {
    const question = input.trim()
    if (!question) return
    
    const userMsgId = `u-${Date.now()}`
    const assistantMsgId = `a-${Date.now()}`
    
    updateActiveThread((thread) => ({
      ...thread,
      title: thread.title === 'Untitled research' ? question.slice(0, 56) : thread.title,
      messages: [
        ...thread.messages,
        { id: userMsgId, role: 'user', content: question },
        { id: assistantMsgId, role: 'assistant', content: 'Thinking...' },
      ],
    }))
    setInput('')
    
    try {
      const apiToken = import.meta.env.VITE_API_TOKEN ?? 'dev-token'
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:4000'}/api/v1/research/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`,
        },
        body: JSON.stringify({
          question,
          scope: {
            tags: scope.tags,
            categories: scope.categories,
            dateRange: scope.dateRange,
          }
        }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantText = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          
          const lines = chunk.split('\n')
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim()
              if (data === '[DONE]') continue
              try {
                const parsed = JSON.parse(data)
                if (parsed.text) {
                  assistantText += parsed.text
                  setThreads((current) => current.map((thread) => {
                    if (thread.id !== activeThreadId) return thread
                    return {
                      ...thread,
                      messages: thread.messages.map((msg) => 
                        msg.id === assistantMsgId ? { ...msg, content: assistantText } : msg
                      ),
                      updatedAt: new Date().toISOString(),
                    }
                  }))
                }
              } catch {
                assistantText += data
                setThreads((current) => current.map((thread) => {
                  if (thread.id !== activeThreadId) return thread
                  return {
                    ...thread,
                    messages: thread.messages.map((msg) => 
                      msg.id === assistantMsgId ? { ...msg, content: assistantText } : msg
                    ),
                    updatedAt: new Date().toISOString(),
                  }
                }))
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('[Research] Ingest streaming error:', err)
      const errorMsg = err instanceof Error ? err.message : String(err)
      setThreads((current) => current.map((thread) => {
        if (thread.id !== activeThreadId) return thread
        return {
          ...thread,
          messages: thread.messages.map((msg) => 
            msg.id === assistantMsgId ? { ...msg, content: `Error: Failed to stream research answer. Details: ${errorMsg}` } : msg
          ),
          updatedAt: new Date().toISOString(),
        }
      }))
    }
  }, [input, scope, activeThreadId, updateActiveThread])

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
