import { useCallback, useEffect, useState } from 'react'
import type { AsyncState } from '@/types/ui'

export function useAsync<T>(loader: () => Promise<T>, initialData: T): AsyncState<T> & { reload: () => Promise<void> } {
  const [state, setState] = useState<AsyncState<T>>({
    status: 'idle',
    data: initialData,
    error: null,
  })

  const reload = useCallback(async () => {
    setState((current) => ({ ...current, status: 'loading', error: null }))
    try {
      const data = await loader()
      const empty = Array.isArray(data) && data.length === 0
      setState({ data, status: empty ? 'empty' : 'success', error: null })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong'
      setState((current) => ({ ...current, status: 'error', error: message }))
    }
  }, [loader])

  useEffect(() => {
    void reload()
  }, [reload])

  return { ...state, reload }
}
