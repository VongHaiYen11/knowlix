import { X } from 'lucide-react'
import type { ReactNode } from 'react'

export function FilterChip({ children, onClear }: { children: ReactNode; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs text-accent-foreground">
      {children}
      <button onClick={onClear} className="ml-0.5 text-accent-foreground/70 hover:text-accent-foreground" aria-label="Remove filter">
        <X className="h-3 w-3" />
      </button>
    </span>
  )
}
