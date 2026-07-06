import type { ComponentType, ReactNode } from 'react'

interface SettingsGroupProps {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
  title: string
  children: ReactNode
}

export function SettingsGroup({ icon: Icon, title, children }: SettingsGroupProps) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-medium tracking-wide text-muted-foreground">
        <Icon className="h-4 w-4" strokeWidth={1.75} />
        {title}
      </h2>
      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">{children}</div>
    </section>
  )
}

export function SettingsRow({ label, hint, children }: { label: string; hint: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <p className="text-[15px] text-foreground">{label}</p>
        <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{hint}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}
