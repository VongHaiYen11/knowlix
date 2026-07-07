import { AlertTriangle, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  error?: string | null
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  error,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button className="absolute inset-0 bg-foreground/25" aria-label="Close dialog" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl">
        <button className="absolute right-3 top-3 rounded-lg p-1 text-muted-foreground transition hover:bg-secondary hover:text-foreground" onClick={onCancel} aria-label="Close dialog">
          <X className="h-4 w-4" />
        </button>
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <AlertTriangle className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div>
            <h2 className="font-serif text-xl leading-snug tracking-tight">{title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{message}</p>
          </div>
        </div>
        {error && <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={loading}>{cancelLabel}</Button>
          <Button size="sm" onClick={onConfirm} disabled={loading} className="bg-destructive text-white hover:opacity-90">{loading ? 'Deleting...' : confirmLabel}</Button>
        </div>
      </div>
    </div>
  )
}
