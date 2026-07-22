import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { researchService, type ResearchReference, type ResearchMessage, type ResearchScope, type ResearchThread } from '@/services/researchService'

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

function collectCitedReferences(messages: ResearchMessage[]) {
  const referencesById = new Map<string, ResearchReference>()
  for (const message of messages) {
    if (message.role !== 'assistant') continue
    for (const reference of message.references ?? []) {
      const existing = referencesById.get(reference.id)
      if (!existing) {
        referencesById.set(reference.id, reference)
        continue
      }
      referencesById.set(reference.id, {
        ...existing,
        tags: Array.from(new Set([...(existing.tags ?? []), ...(reference.tags ?? [])])),
        categories: Array.from(new Set([...(existing.categories ?? []), ...(reference.categories ?? [])])),
      })
    }
  }
  return Array.from(referencesById.values())
}

export function useResearch(initialQuestion: string) {
  const [threads, setThreads] = useState<ResearchThread[]>([])
  const [activeThreadId, setActiveThreadId] = useState('')
  const [input, setInput] = useState(initialQuestion)
  const [summaryLoadingThreadId, setSummaryLoadingThreadId] = useState<string | null>(null)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const pendingPersistIds = useRef(new Set<string>())
  const activeThread = threads.find((thread) => thread.id === activeThreadId) ?? threads[0]
  const messages = activeThread?.messages ?? []
  const usedReferences = useMemo(() => collectCitedReferences(messages), [messages])
  const scope = activeThread?.scope ?? defaultScope

  useEffect(() => {
    if (!pendingPersistIds.current.size) return
    const ids = Array.from(pendingPersistIds.current)
    ids.forEach((id) => pendingPersistIds.current.delete(id))
    for (const id of ids) {
      const thread = threads.find((item) => item.id === id)
      if (!thread) continue
      void researchService.saveThread(thread).catch((err) => {
        console.warn('[Research] Could not save research thread:', err)
      })
    }
  }, [threads])

  useEffect(() => {
    let cancelled = false
    async function loadServerThreads() {
      try {
        const remoteThreads = await researchService.getThreads()
        if (cancelled) return
        if (remoteThreads.length) {
          setThreads(remoteThreads)
          setActiveThreadId((current) => remoteThreads.some((thread) => thread.id === current) ? current : remoteThreads[0].id)
          return
        }

        setThreads([])
        setActiveThreadId('')
      } catch (err) {
        console.warn('[Research] Could not load DB-backed research threads:', err)
        if (!cancelled) {
          setThreads([])
          setActiveThreadId('')
        }
      }
    }
    void loadServerThreads()
    return () => {
      cancelled = true
    }
  }, [])

  const updateThread = useCallback((targetId: string, updater: (thread: ResearchThread) => ResearchThread, persist = true) => {
    setThreads((current) => current.map((thread) => {
      if (thread.id !== targetId) return thread
      const nextThread = { ...updater(thread), updatedAt: new Date().toISOString() }
      if (persist) pendingPersistIds.current.add(nextThread.id)
      return nextThread
    }))
  }, [])

  const updateActiveThread = useCallback((updater: (thread: ResearchThread) => ResearchThread, persist = true) => {
    if (!activeThreadId) return
    updateThread(activeThreadId, updater, persist)
  }, [activeThreadId, updateThread])

  const send = useCallback(async () => {
    const question = input.trim()
    if (!question) return
    
    const userMsgId = `u-${Date.now()}`
    const assistantMsgId = `a-${Date.now()}`
    let threadForResponseId = activeThread?.id ?? ''
    
    const applyQuestion = (thread: ResearchThread): ResearchThread => ({
      ...thread,
      title: !thread.titleManuallyEdited && thread.title === 'Untitled' ? titleFromQuestion(question) : thread.title,
      messages: [
        ...thread.messages,
        { id: userMsgId, role: 'user', content: question },
        { id: assistantMsgId, role: 'assistant', content: 'Thinking...', references: [] },
      ],
    })

    if (!activeThread) {
      const thread = applyQuestion(createThread())
      setThreads([thread])
      setActiveThreadId(thread.id)
      pendingPersistIds.current.add(thread.id)
      threadForResponseId = thread.id
    } else {
      updateActiveThread(applyQuestion)
      threadForResponseId = activeThread.id
    }
    setInput('')
    
    try {
      const response = await researchService.streamMessage(question, {
        tags: [],
        categories: [],
        dateRange: defaultDateRange,
      })

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantText = ''
      let availableReferences: ResearchReference[] = []

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
                if (Array.isArray(parsed.references)) {
                  const validReferences = parsed.references.filter((reference: Partial<ResearchReference>) => (
                    typeof reference.number === 'number' &&
                    typeof reference.id === 'string' &&
                    typeof reference.type === 'string' &&
                    typeof reference.title === 'string'
                  )) as ResearchReference[]
                  availableReferences = validReferences.map((reference) => ({
                    ...reference,
                    tags: Array.isArray(reference.tags) ? reference.tags : [],
                    categories: Array.isArray(reference.categories) ? reference.categories : [],
                  }))
                  continue
                }
                if (parsed.text) {
                  assistantText += parsed.text
                  updateThread(threadForResponseId, (thread) => ({
                    ...thread,
                    messages: thread.messages.map((msg) =>
                      msg.id === assistantMsgId ? { ...msg, content: assistantText } : msg
                    ),
                  }), false)
                }
              } catch {
                assistantText += data
                updateThread(threadForResponseId, (thread) => ({
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
      const citedNumbers = new Set(Array.from(assistantText.matchAll(/\[(\d+)\]/g)).map((match) => Number(match[1])))
      const citedReferences = availableReferences.filter((reference) => citedNumbers.has(reference.number))
      updateThread(threadForResponseId, (thread) => ({
        ...thread,
        messages: thread.messages.map((msg) =>
          msg.id === assistantMsgId ? { ...msg, references: citedReferences } : msg
        ),
      }))
    } catch (err) {
      console.error('[Research] Ingest streaming error:', err)
      const errorMsg = err instanceof Error ? err.message : String(err)
      updateThread(threadForResponseId, (thread) => ({
        ...thread,
        messages: thread.messages.map((msg) =>
          msg.id === assistantMsgId ? { ...msg, content: `Error: Failed to stream research answer. Details: ${errorMsg}` } : msg
        ),
      }))
    }
  }, [activeThread, input, updateActiveThread, updateThread])

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

  const deleteThread = useCallback(async (id: string) => {
    pendingPersistIds.current.delete(id)
    await researchService.deleteThread(id)
    setThreads((current) => {
      const next = current.filter((thread) => thread.id !== id)
      setActiveThreadId((activeId) => activeId === id ? next[0]?.id ?? '' : activeId)
      return next
    })
    setSummaryLoadingThreadId((current) => current === id ? null : current)
    setSummaryError(null)
  }, [])

  const generateSummary = useCallback(async (id = activeThreadId) => {
    const thread = threads.find((item) => item.id === id)
    if (!thread) throw new Error('Research thread not found')
    if (thread.messages.length <= 3) throw new Error('A conversation needs more than 3 messages before it can be summarized')
    setSummaryLoadingThreadId(id)
    setSummaryError(null)
    try {
      await researchService.saveThread(thread)
      const summary = await researchService.generateThreadSummary(id)
      setThreads((current) => current.map((item) => item.id === id ? { ...item, summary, updatedAt: new Date().toISOString() } : item))
      return summary
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not generate summary'
      setSummaryError(message)
      throw error
    } finally {
      setSummaryLoadingThreadId(null)
    }
  }, [activeThreadId, threads])

  return {
    activeThread,
    threads,
    messages,
    input,
    setInput,
    scope,
    setScope,
    usedReferences,
    send,
    reset,
    renameThread,
    selectThread,
    deleteThread,
    generateSummary,
    summaryLoadingThreadId,
    summaryError,
    clearSummaryError: () => setSummaryError(null),
  }
}
