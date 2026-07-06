import { Plus, Upload } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/Button'
import { ROUTES } from '@/constants/routes'
import type { SourceType } from '@/types/knowledge'

interface LibraryToolbarProps {
  values: string[]
  active: string
  onChange: (value: SourceType | 'All' | string) => void
  description?: string
  sourcesMode?: boolean
}

export function LibraryToolbar({ values, active, onChange, description, sourcesMode }: LibraryToolbarProps) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      {sourcesMode ? (
        <>
          <Link to={ROUTES.note('new')} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-3.5 text-sm text-primary-foreground transition hover:opacity-90">
            <Plus className="h-4 w-4" />New Note
          </Link>
          <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3.5 text-sm text-foreground transition hover:border-ring/40">
            <Upload className="h-4 w-4" strokeWidth={1.75} />Upload
            <input type="file" multiple className="hidden" aria-label="Upload source files" />
          </label>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      <div className="ml-auto flex flex-wrap gap-1.5">
        {values.map((value) => (
          <Button key={value} variant={active === value ? 'secondary' : 'ghost'} size="sm" onClick={() => onChange(value)}>{value}</Button>
        ))}
      </div>
    </div>
  )
}
