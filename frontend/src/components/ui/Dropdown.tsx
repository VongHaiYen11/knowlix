import { Check, ChevronDown } from 'lucide-react'
import { useState, type ComponentType, type ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface DropdownProps {
  icon?: ComponentType<{ className?: string; strokeWidth?: number }>
  label: string
  options: string[]
  selected: string[]
  onToggle: (value: string) => void
  prefix?: string
  badge?: ReactNode
  className?: string
  triggerClassName?: string
  showSelectedCount?: boolean
}

export function Dropdown({ icon: Icon, label, options, selected, onToggle, prefix = '', badge, className, triggerClassName, showSelectedCount = true }: DropdownProps) {
  const [open, setOpen] = useState(false)
  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition',
          selected.length ? 'border-primary/40 bg-accent text-accent-foreground' : 'border-border bg-card text-muted-foreground hover:text-foreground',
          triggerClassName,
        )}
      >
        {Icon && <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />}
        <span className="min-w-0 flex-1 text-left">{label}</span>
        {showSelectedCount && selected.length > 0 && <span className="rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">{selected.length}</span>}
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <>
          <button className="fixed inset-0 z-40 cursor-default" aria-label="Close menu" onClick={() => setOpen(false)} />
          <div className="elevated-raised absolute left-0 top-9 z-50 max-h-64 w-52 overflow-auto rounded-xl border border-border bg-popover p-1">
            {badge && <div className="px-2.5 py-1.5">{badge}</div>}
            {options.map((option) => {
              const active = selected.includes(option)
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => onToggle(option)}
                  className={cn('flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition', active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground')}
                >
                  <span className="flex-1 text-left">{prefix}{option}</span>
                  {active && <Check className="h-3.5 w-3.5" />}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
