interface EmptyStateProps {
  title?: string
  message: string
}

export function EmptyState({ title, message }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-secondary/40 p-8 text-center">
      {title && <p className="mb-1 text-sm text-foreground">{title}</p>}
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
