import { apiClient } from '@/repositories/apiClient'

export interface ResearchReference {
  number: number
  id: string
  type: string
  title: string
  tags?: string[]
  categories?: string[]
}

export interface ResearchMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  references?: ResearchReference[]
}

export interface ResearchScope {
  tags: string[]
  categories: string[]
  dateRange: string
}

export interface ResearchSummary {
  content: string
  generatedAt: string
  model: string
  messageCount: number
}

export interface ResearchThread {
  id: string
  title: string
  messages: ResearchMessage[]
  scope: ResearchScope
  createdAt: string
  updatedAt: string
  titleManuallyEdited?: boolean
  summary?: ResearchSummary
}

export class ResearchService {
  async streamMessage(question: string, scope: ResearchScope): Promise<Response> {
    return apiClient.stream('/api/v1/research/messages', {
      method: 'POST',
      body: JSON.stringify({ question, scope }),
    })
  }

  async getThreads(): Promise<ResearchThread[]> {
    return apiClient.get<ResearchThread[]>('/api/v1/research/threads')
  }

  async saveThread(thread: ResearchThread): Promise<ResearchThread> {
    return apiClient.post<ResearchThread>('/api/v1/research/threads', thread)
  }

  async deleteThread(id: string): Promise<void> {
    return apiClient.delete<void>(`/api/v1/research/threads/${encodeURIComponent(id)}`)
  }

  async generateThreadSummary(id: string): Promise<ResearchSummary> {
    return apiClient.post<ResearchSummary>(`/api/v1/research/threads/${encodeURIComponent(id)}/summary`, {})
  }
}

export const researchService = new ResearchService()
