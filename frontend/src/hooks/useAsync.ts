import { useCallback, useEffect, useRef, useState } from 'react'
import type { AsyncState } from '@/types/ui'

export function useAsync<T>(loader: () => Promise<T>, initialData: T): AsyncState<T> & { reload: () => Promise<void>; setData: (updater: T | ((current: T) => T)) => void } {
  const requestId = useRef(0)
  const [state, setState] = useState<AsyncState<T>>({
    status: 'idle',
    data: initialData,
    error: null,
  })

  const reload = useCallback(async () => {
    const currentRequestId = requestId.current + 1
    requestId.current = currentRequestId
    setState((current) => ({ ...current, status: 'loading', error: null }))
    try {
      const data = await loader()
      if (requestId.current !== currentRequestId) return
      const empty = Array.isArray(data) && data.length === 0
      setState({ data, status: empty ? 'empty' : 'success', error: null })
    } catch (error) {
      if (requestId.current !== currentRequestId) return
      const message = error instanceof Error ? error.message : 'Something went wrong'
      setState((current) => ({ ...current, status: 'error', error: message }))
    }
  }, [loader])

  const setData = useCallback((updater: T | ((current: T) => T)) => {
    setState((current) => {
      const data = typeof updater === 'function' ? (updater as (value: T) => T)(current.data) : updater
      const empty = Array.isArray(data) && data.length === 0
      return { data, status: empty ? 'empty' : 'success', error: null }
    })
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return { ...state, reload, setData }
}
