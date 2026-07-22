const apiBaseUrl = (import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:4000').replace(/\/$/, '')

export interface PaginatedResponse<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!apiBaseUrl) throw new Error('VITE_API_URL is not configured')

  const headers = new Headers(init.headers)
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json')

  const response = await fetch(`${apiBaseUrl}${path}`, { ...init, headers, credentials: 'include' })
  if (response.status === 204) return undefined as T

  const payload = await response.json().catch(() => undefined)
  if (!response.ok) {
    const message = payload?.error?.message ?? `API request failed with status ${response.status}`
    throw new Error(message)
  }

  return payload as T
}

async function requestText(path: string): Promise<string> {
  if (!apiBaseUrl) throw new Error('VITE_API_URL is not configured')
  const response = await fetch(`${apiBaseUrl}${path}`, { credentials: 'include' })
  if (!response.ok) throw new Error(`API request failed with status ${response.status}`)
  return response.text()
}

async function requestStream(path: string, init: RequestInit = {}): Promise<Response> {
  if (!apiBaseUrl) throw new Error('VITE_API_URL is not configured')

  const headers = new Headers(init.headers)
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json')

  const response = await fetch(`${apiBaseUrl}${path}`, { ...init, headers, credentials: 'include' })
  if (!response.ok) {
    const payload = await response.json().catch(() => undefined)
    const message = payload?.error?.message ?? `API request failed with status ${response.status}`
    throw new Error(message)
  }
  return response
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  text: (path: string) => requestText(path),
  stream: (path: string, init: RequestInit = {}) => requestStream(path, init),
  post: <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  postForm: <T>(path: string, body: FormData) => request<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}

export function apiUrl(path: string): string {
  return `${apiBaseUrl}${path}`
}

export async function getAllPages<T>(path: string): Promise<T[]> {
  const separator = path.includes('?') ? '&' : '?'
  const first = await apiClient.get<PaginatedResponse<T>>(`${path}${separator}page=1&pageSize=100`)
  if (first.items.length >= first.total) return first.items

  const pages = Math.ceil(first.total / first.pageSize)
  const rest = await Promise.all(
    Array.from({ length: pages - 1 }, (_, index) =>
      apiClient.get<PaginatedResponse<T>>(`${path}${separator}page=${index + 2}&pageSize=100`),
    ),
  )
  return [first, ...rest].flatMap((page) => page.items)
}
