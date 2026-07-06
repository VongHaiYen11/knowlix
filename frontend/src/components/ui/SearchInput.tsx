import { Search } from 'lucide-react'
import type { InputHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  shellClassName?: string
}

export function SearchInput({ shellClassName, className, ...props }: SearchInputProps) {
  return (
    <div className={cn('flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4 transition focus-within:border-ring/40 elevated', shellClassName)}>
      <Search className="h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
      <input className={cn('min-w-0 flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none', className)} {...props} />
    </div>
  )
}
