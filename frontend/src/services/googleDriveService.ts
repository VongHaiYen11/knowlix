import { apiClient } from '@/repositories/apiClient'

export type GoogleDriveStatus = {
  configured: boolean
  connected: boolean
  googleAccountEmail?: string
  folder: { id: string; name: string } | null
  status: 'disconnected' | 'connected' | 'syncing' | 'error' | 'reauthorization_required'
  lastSyncAt?: string | null
  nextSyncAt?: string | null
  lastError?: string | null
  counts: Partial<Record<'pending' | 'processing' | 'processed' | 'unsupported' | 'failed' | 'removed', number>>
}

export type GoogleDriveFolder = {
  id: string
  name: string
  modifiedTime?: string | null
  parentIds?: string[]
}

const endpoint = '/api/v1/integrations/google-drive'

export const googleDriveService = {
  status: () => apiClient.get<GoogleDriveStatus>(endpoint),
  startOauth: () => apiClient.post<{ authorizationUrl: string }>(`${endpoint}/oauth/start`, {}),
  folders: () => apiClient.get<{ folders: GoogleDriveFolder[] }>(`${endpoint}/folders`),
  setFolder: (folderId: string) => apiClient.put<GoogleDriveStatus>(`${endpoint}/folder`, { folderId }),
  sync: () => apiClient.post<{ accepted: true }>(`${endpoint}/sync`, {}),
  disconnect: () => apiClient.delete<void>(endpoint),
}
