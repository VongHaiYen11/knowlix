import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

export interface TabItem<T extends string> {
  value: T
  label: string
}

interface TabsProps<T extends string> {
  tabs: TabItem<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}

export function Tabs<T extends string>({ tabs, value, onChange, className }: TabsProps<T>) {
  return (
    <div className={cn('flex w-full items-center gap-1 border-b border-border', className)} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          role="tab"
          aria-selected={value === tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            '-mb-px min-w-28 border-b-2 px-4 py-2.5 text-sm transition',
            value === tab.value ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export function TabPanel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mt-6', className)}>{children}</div>
}
