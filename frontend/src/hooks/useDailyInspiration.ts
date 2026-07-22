import { useEffect, useState } from 'react'
import type { AuthUser } from '@/auth/authTypes'
import { inspirationService } from '@/services/inspirationService'
import { vietnamDateString } from '@/utils/vietnamTime'

const fallbackQuote = 'Tiny notes become bright paths when you return to them with curiosity.'

export function useDailyInspiration(user: AuthUser | null) {
  const [quote, setQuote] = useState(fallbackQuote)
  const [status, setStatus] = useState<'loading' | 'success'>('loading')

  useEffect(() => {
    if (!user) {
      setQuote(fallbackQuote)
      setStatus('success')
      return
    }

    const date = vietnamDateString()
    const storageKey = `knowlix.dailyInspiration.${user.id}.${date}`
    const cached = localStorage.getItem(storageKey)
    if (cached) {
      setQuote(cached)
      setStatus('success')
      return
    }

    let cancelled = false
    setStatus('loading')
    inspirationService.today()
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
