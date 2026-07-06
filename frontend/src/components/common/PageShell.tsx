import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

type PageShellVariant = 'default' | 'readable' | 'wide'

interface PageShellProps {
  children: ReactNode
  className?: string
  variant?: PageShellVariant
}

const variantClass: Record<PageShellVariant, string> = {
  default: 'page-frame',
  readable: 'page-frame-readable',
  wide: 'page-frame-wide',
}

export function PageShell({ children, className, variant = 'default' }: PageShellProps) {
  return <div className={cn(variantClass[variant], className)}>{children}</div>
}
