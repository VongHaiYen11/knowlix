import { useEffect, useState } from 'react'
import type { AuthUser } from '@/auth/authTypes'
import { getModelPreference } from '@/utils/modelPreference'

interface DailyInspiration {
  date: string
  quote: string
}

const fallbackQuote = 'Tiny notes become bright paths when you return to them with curiosity.'

function todayKey() {
  const date = new Date()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function useDailyInspiration(user: AuthUser | null) {
  const [quote, setQuote] = useState(fallbackQuote)
  const [status, setStatus] = useState<'loading' | 'success'>('loading')

  useEffect(() => {
    if (!user) {
      setQuote(fallbackQuote)
      setStatus('success')
      return
    }

    const date = todayKey()
    const storageKey = `knowlix.dailyInspiration.${user.id}.${date}`
    const cached = localStorage.getItem(storageKey)
    if (cached) {
      setQuote(cached)
      setStatus('success')
      return
    }

    let cancelled = false
    setStatus('loading')
    fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:4000'}/api/v1/inspiration/today`, {
      credentials: 'include',
      headers: { 'X-Knowlix-Model': getModelPreference() },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load inspiration')
        return response.json() as Promise<DailyInspiration>
      })
      .then((data) => {
        if (cancelled) return
        const nextQuote = data.quote || fallbackQuote
        localStorage.setItem(storageKey, nextQuote)
        setQuote(nextQuote)
        setStatus('success')
      })
      .catch(() => {
        if (cancelled) return
        setQuote(fallbackQuote)
        setStatus('success')
      })

    return () => {
      cancelled = true
    }
  }, [user])

  return { quote, status }
}
