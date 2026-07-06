export type AsyncStatus = 'idle' | 'loading' | 'success' | 'empty' | 'error'

export interface AsyncState<T> {
  status: AsyncStatus
  data: T
  error: string | null
}

export interface SelectOption {
  label: string
  value: string
}
