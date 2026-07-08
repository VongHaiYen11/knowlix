import { useCallback, useEffect, useState } from 'react'
import { researchService, type ResearchScope, type ResearchThread } from '@/services/researchService'
import type { KnowledgeEntry } from '@/types/knowledge'
import { getModelPreference } from '@/utils/modelPreference'

const storageKey = 'knowlix.researchThreads'
const defaultDateRange = 'Anytime'
const defaultScope: ResearchScope = { tags: [], categories: [], dateRange: defaultDateRange }

const createThread = (title = 'Untitled'): ResearchThread => {
  const now = new Date().toISOString()
  return {
    id: `thread-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    messages: [],
    scope: defaultScope,
    createdAt: now,
    updatedAt: now,
    titleManuallyEdited: false,
  }
}

function titleFromQuestion(question: string) {
  return question.trim().split(/\s+/).slice(0, 3).join(' ') || 'Untitled'
}

function isLegacyInitializedThread(thread: ResearchThread) {
  return thread.messages.length > 0 && thread.messages.every((message) => message.id.startsWith('seed-'))
}

const loadThreads = (): ResearchThread[] => {
  try {
    const stored = localStorage.getItem(storageKey)
    if (!stored) return [createThread()]
    const parsed = JSON.parse(stored) as ResearchThread[]
    if (!Array.isArray(parsed) || !parsed.length) return [createThread()]
    const threads = parsed.filter((thread) => !isLegacyInitializedThread(thread)).map((thread) => ({
      ...thread,
      title: thread.title === 'Untitled research' ? 'Untitled' : thread.title,
      titleManuallyEdited: thread.titleManuallyEdited ?? !['Untitled', 'Untitled research'].includes(thread.title),
      scope: {
        ...thread.scope,
        dateRange: thread.scope.dateRange === 'Any time' ? defaultDateRange : thread.scope.dateRange,
      },
    }))
    return threads.length ? threads : [createThread()]
  } catch {
    return [createThread()]
  }
}

export function useResearch(initialQuestion: string) {
  const [threads, setThreads] = useState<ResearchThread[]>(loadThreads)
  const [activeThreadId, setActiveThreadId] = useState(() => threads[0]?.id ?? '')
  const [input, setInput] = useState(initialQuestion)
  const [scopedKnowledge, setScopedKnowledge] = useState<KnowledgeEntry[]>([])
  const activeThread = threads.find((thread) => thread.id === activeThreadId) ?? threads[0]
  const messages = activeThread?.messages ?? []
  const scope = activeThread?.scope ?? defaultScope

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(threads))
  }, [threads])

  useEffect(() => {
    let cancelled = false
    async function loadServerThreads() {
      try {
        const remoteThreads = await researchService.getThreads()
        if (cancelled) return
        if (remoteThreads.length) {
          setThreads(remoteThreads)
          setActiveThreadId(remoteThreads[0].id)
          localStorage.setItem(storageKey, JSON.stringify(remoteThreads))
          return
        }

        const localThreads = loadThreads()
        await Promise.all(localThreads.map((thread) => researchService.saveThread(thread)))
        if (!cancelled) {
          setThreads(localThreads)
          setActiveThreadId(localThreads[0]?.id ?? '')
        }
      } catch (err) {
        console.warn('[Research] Could not load DB-backed research threads, using local cache:', err)
      }
    }
    void loadServerThreads()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const lastQuestion = [...messages].reverse().find((message) => message.role === 'user')?.content ?? input
    void researchService.getScopedKnowledge(scope, lastQuestion).then(setScopedKnowledge)
  }, [scope, input, messages])

  const updateActiveThread = useCallback((updater: (thread: ResearchThread) => ResearchThread, persist = true) => {
    let nextThread: ResearchThread | undefined
    setThreads((current) => current.map((thread) => (
      thread.id === activeThreadId ? (nextThread = { ...updater(thread), updatedAt: new Date().toISOString() }) : thread
    )))
    if (persist && nextThread) {
      void researchService.saveThread(nextThread).catch((err) => {
        console.warn('[Research] Could not save research thread:', err)
      })
    }
  }, [activeThreadId])

  const send = useCallback(async () => {
    const question = input.trim()
    if (!question) return
    
    const userMsgId = `u-${Date.now()}`
    const assistantMsgId = `a-${Date.now()}`
    
    updateActiveThread((thread) => ({
      ...thread,
      title: !thread.titleManuallyEdited && thread.title === 'Untitled' ? titleFromQuestion(question) : thread.title,
      messages: [
        ...thread.messages,
        { id: userMsgId, role: 'user', content: question },
        { id: assistantMsgId, role: 'assistant', content: 'Thinking...' },
      ],
    }))
    setInput('')
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:4000'}/api/v1/research/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Knowlix-Model': getModelPreference(),
        },
        credentials: 'include',
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
                  updateActiveThread((thread) => ({
                    ...thread,
                    messages: thread.messages.map((msg) =>
                      msg.id === assistantMsgId ? { ...msg, content: assistantText } : msg
                    ),
                  }), false)
                }
              } catch {
                assistantText += data
                updateActiveThread((thread) => ({
                  ...thread,
                  messages: thread.messages.map((msg) =>
                    msg.id === assistantMsgId ? { ...msg, content: assistantText } : msg
                  ),
                }), false)
              }
            }
          }
        }
      }
      updateActiveThread((thread) => thread)
    } catch (err) {
      console.error('[Research] Ingest streaming error:', err)
      const errorMsg = err instanceof Error ? err.message : String(err)
      updateActiveThread((thread) => ({
        ...thread,
        messages: thread.messages.map((msg) =>
          msg.id === assistantMsgId ? { ...msg, content: `Error: Failed to stream research answer. Details: ${errorMsg}` } : msg
        ),
      }))
    }
  }, [input, scope, activeThreadId, updateActiveThread])

  const reset = useCallback(() => {
    const thread = createThread()
    setThreads((current) => [thread, ...current])
    setActiveThreadId(thread.id)
    setInput('')
    void researchService.saveThread(thread).catch((err) => {
      console.warn('[Research] Could not save new research thread:', err)
    })
  }, [])

  const setScope = useCallback((nextScope: ResearchScope) => {
    updateActiveThread((thread) => ({ ...thread, scope: nextScope }))
  }, [updateActiveThread])

  const renameThread = useCallback((title: string) => {
    updateActiveThread((thread) => ({ ...thread, title, titleManuallyEdited: true }))
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
