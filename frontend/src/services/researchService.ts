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
}

export const researchService = new ResearchService()
