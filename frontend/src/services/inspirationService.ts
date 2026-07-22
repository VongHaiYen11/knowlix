import { apiClient } from '@/repositories/apiClient'

export interface DailyInspiration {
  date: string
  quote: string
}

export const inspirationService = {
  today: () => apiClient.get<DailyInspiration>('/api/v1/inspiration/today'),
}
