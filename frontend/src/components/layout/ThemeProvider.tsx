import { createContext, useContext, type ReactNode } from 'react'
import { useThemeMode, type ThemeMode } from '@/hooks/useThemeMode'

interface ThemeContextValue {
  theme: ThemeMode
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: ThemeMode) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useThemeMode()
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
}

export function useThemeContext() {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useThemeContext must be used inside ThemeProvider')
  return value
}
