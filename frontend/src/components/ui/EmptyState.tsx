import type { ComponentType, ReactNode } from 'react'
import boredImage from '@/assets/bored.png'
import { cn } from '@/utils/cn'

interface EmptyStateProps {
  title?: string
  message: string
  image?: boolean
  imageSrc?: string
  icon?: ComponentType<{ className?: string; strokeWidth?: number }>
  className?: string
  action?: ReactNode
}

export function EmptyState({ title, message, image = false, imageSrc = boredImage, icon: Icon, className, action }: EmptyStateProps) {
  return (
    <div className={cn('rounded-2xl border border-dashed border-border bg-card p-8 text-center elevated', className)}>
      {(image || Icon) && (
        <div className="relative mx-auto mb-4 w-fit">
          {image && <img src={imageSrc} alt="" className="h-28 w-28 object-contain" />}
          {Icon && <span className={cn('inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-primary shadow-sm', image && 'absolute -right-1 -top-1')}><Icon className="h-4 w-4" strokeWidth={1.75} /></span>}
        </div>
      )}
      {title && <p className="mb-1 font-serif text-xl tracking-tight text-foreground">{title}</p>}
      <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">{message}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  )
}
