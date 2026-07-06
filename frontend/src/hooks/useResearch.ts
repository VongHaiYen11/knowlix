import { useCallback, useEffect, useState } from 'react'
import { researchService, type ResearchMessage, type ResearchScope } from '@/services/researchService'
import type { KnowledgeEntry } from '@/types/knowledge'

const defaultScope: ResearchScope = { tags: [], categories: [], dateRange: 'Any time' }
const seedMessages: ResearchMessage[] = [
  { id: 'seed-u', role: 'user', content: 'What do I actually know about how memory works?' },
  { id: 'seed-a', role: 'assistant', content: 'Across your knowledge pages, three ideas form a coherent picture: memory decays, retrieval strengthens it, and spaced repetition operationalizes both.' },
]

export function useResearch(initialQuestion: string) {
  const [messages, setMessages] = useState<ResearchMessage[]>(seedMessages)
  const [input, setInput] = useState(initialQuestion)
  const [scope, setScope] = useState<ResearchScope>(defaultScope)
  const [scopedKnowledge, setScopedKnowledge] = useState<KnowledgeEntry[]>([])

  useEffect(() => {
    void researchService.getScopedKnowledge(scope).then(setScopedKnowledge)
  }, [scope])

  const send = useCallback(() => {
    const question = input.trim()
    if (!question) return
    setMessages((current) => [
      ...current,
      researchService.buildUserMessage(question),
      researchService.buildAssistantReply(question, scopedKnowledge.length),
    ])
    setInput('')
  }, [input, scopedKnowledge.length])

  const reset = useCallback(() => {
    setMessages(seedMessages)
    setInput('')
    setScope(defaultScope)
  }, [])

  return { messages, input, setInput, scope, setScope, scopedKnowledge, send, reset }
}
