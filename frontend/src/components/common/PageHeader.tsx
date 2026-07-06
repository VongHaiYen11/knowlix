import type { ReactNode } from 'react'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { useShellControls } from '@/components/layout/ShellControlsContext'
import { cn } from '@/utils/cn'

interface PageHeaderProps {
  title: string
  description?: string
  eyebrow?: ReactNode
  action?: ReactNode
  className?: string
}

export function PageHeader({ title, description, eyebrow, action, className }: PageHeaderProps) {
  const shellControls = useShellControls()

  return (
    <header className={cn('mb-10 flex items-start justify-between gap-4', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {shellControls && (
          <Button variant="ghost" size="icon" onClick={shellControls.openMobileNavigation} className="mt-1 shrink-0 md:hidden" aria-label="Open navigation">
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <div className="min-w-0">
          {eyebrow && <div className="mb-3 text-sm text-muted-foreground">{eyebrow}</div>}
          <h1 className="font-serif text-4xl leading-tight tracking-tight md:text-5xl">{title}</h1>
          {description && <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{description}</p>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {action}
        <ThemeToggle />
      </div>
    </header>
  )
}
