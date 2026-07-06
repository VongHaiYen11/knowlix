import { ArrowRight } from 'lucide-react'
import type { ComponentType } from 'react'
import { Link } from 'react-router'

interface SectionHeadingProps {
  title: string
  href?: string
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
}

export function SectionHeading({ title, href, icon: Icon }: SectionHeadingProps) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="flex items-center gap-2 text-sm font-medium tracking-wide text-muted-foreground">
        <Icon className="h-4 w-4" strokeWidth={1.75} />
        {title}
      </h2>
      {href && (
        <Link to={href} className="inline-flex items-center gap-1 text-xs text-muted-foreground transition hover:text-foreground">
          View all
          <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  )
}
