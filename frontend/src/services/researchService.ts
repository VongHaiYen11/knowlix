import { libraryService } from '@/services/libraryService'
import { apiClient } from '@/repositories/apiClient'
import type { KnowledgeEntry } from '@/types/knowledge'

export interface ResearchMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export interface ResearchScope {
  tags: string[]
  categories: string[]
  dateRange: string
}

export interface ResearchThread {
  id: string
  title: string
  messages: ResearchMessage[]
  scope: ResearchScope
  createdAt: string
  updatedAt: string
  titleManuallyEdited?: boolean
}

export class ResearchService {
  async getThreads(): Promise<ResearchThread[]> {
    return apiClient.get<ResearchThread[]>('/api/v1/research/threads')
  }

  async saveThread(thread: ResearchThread): Promise<ResearchThread> {
    return apiClient.post<ResearchThread>('/api/v1/research/threads', thread)
  }

  async deleteThread(id: string): Promise<void> {
    return apiClient.delete<void>(`/api/v1/research/threads/${encodeURIComponent(id)}`)
  }

  async getScopedKnowledge(scope: ResearchScope, question = ''): Promise<KnowledgeEntry[]> {
    try {
      return await apiClient.post<KnowledgeEntry[]>('/api/v1/research/retrieval-preview', { question: question || 'knowledge', scope })
    } catch {
      // Local fallback keeps the UI usable when API mode is unavailable.
    }
    const knowledge = await libraryService.getKnowledge()
    return knowledge.filter((entry) => {
      if (scope.categories.length && !scope.categories.includes(entry.category)) return false
      if (scope.tags.length && !scope.tags.some((tag) => entry.tags.includes(tag))) return false
      return true
    })
  }

  buildAssistantReply(question: string, scopeSize: number): ResearchMessage {
    return {
      id: `a-${Date.now()}`,
      role: 'assistant',
      content: `Searching ${scopeSize} knowledge page${scopeSize === 1 ? '' : 's'} that match your filters, here is a synthesis grounded only in your knowledge. You can save it as a new page or fold it into an existing one.`,
    }
  }

  buildUserMessage(question: string): ResearchMessage {
    return { id: `u-${Date.now()}`, role: 'user', content: question }
  }
}

export const researchService = new ResearchService()
