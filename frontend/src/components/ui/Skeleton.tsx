import { cn } from '@/utils/cn'

interface SkeletonProps {
  className?: string
  count?: number
}

export function Skeleton({ className, count = 1 }: SkeletonProps) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={cn('animate-pulse rounded-2xl bg-secondary', className ?? 'h-24')} />
      ))}
    </>
  )
}
