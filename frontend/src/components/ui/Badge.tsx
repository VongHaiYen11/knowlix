import type { HTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: 'default' | 'accent' | 'muted'
}

export function Badge({ tone = 'muted', className, ...props }: BadgeProps) {
  const toneClass = {
    default: 'bg-primary text-primary-foreground',
    accent: 'bg-accent text-accent-foreground',
    muted: 'bg-secondary text-muted-foreground',
  }[tone]

  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]', toneClass, className)} {...props} />
}
