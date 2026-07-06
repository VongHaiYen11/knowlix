import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useThemeContext } from './ThemeProvider'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useThemeContext()
  const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark'
  const CurrentIcon = resolvedTheme === 'dark' ? Moon : Sun

  return (
    <Button variant="outline" size="icon" aria-label={`Switch to ${nextTheme} mode`} onClick={() => setTheme(nextTheme)}>
      <CurrentIcon className="h-[18px] w-[18px]" strokeWidth={1.75} />
    </Button>
  )
}
