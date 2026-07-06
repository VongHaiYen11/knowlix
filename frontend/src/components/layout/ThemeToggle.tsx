import { Check, Monitor, Moon, Sun } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useThemeContext } from './ThemeProvider'
import { cn } from '@/utils/cn'

const options = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
] as const

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useThemeContext()
  const [open, setOpen] = useState(false)
  const CurrentIcon = resolvedTheme === 'dark' ? Moon : Sun

  return (
    <div className="relative">
      <Button variant="outline" size="icon" aria-label="Change theme" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <CurrentIcon className="h-[18px] w-[18px]" strokeWidth={1.75} />
      </Button>
      {open && (
        <div className="elevated-raised absolute right-0 top-11 z-50 w-40 rounded-xl border border-border bg-popover p-1">
          {options.map((option) => {
            const active = theme === option.value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setTheme(option.value)
                  setOpen(false)
                }}
                className={cn('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition', active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground')}
              >
                <option.icon className="h-4 w-4" strokeWidth={1.75} />
                <span>{option.label}</span>
                {active && <Check className="ml-auto h-3.5 w-3.5" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
