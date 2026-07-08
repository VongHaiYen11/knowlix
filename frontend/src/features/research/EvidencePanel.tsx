import { FileText, Layers, PanelRightClose, PanelRightOpen, Sparkles, Tag } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Dropdown } from '@/components/ui/Dropdown'
import type { ResearchReference, ResearchScope } from '@/services/researchService'
import { FilterChip } from './FilterChip'

const dateOptions = ['Anytime', 'Past week', 'Past month', 'Past 3 months']

interface EvidencePanelProps {
  references: ResearchReference[]
  tags: string[]
  categories: string[]
  scope: ResearchScope
  onScopeChange: (scope: ResearchScope) => void
  collapsed: boolean
  onCollapsedChange: (collapsed: boolean) => void
}

export function EvidencePanel({ references, tags, categories, scope, onScopeChange, collapsed, onCollapsedChange }: EvidencePanelProps) {
  const hasFilters = scope.tags.length > 0 || scope.categories.length > 0
  const filteredReferences = references.filter((reference) => {
    if (scope.tags.length && !scope.tags.some((tag) => (reference.tags ?? []).includes(tag))) return false
    if (scope.categories.length && !scope.categories.some((category) => (reference.categories ?? []).includes(category))) return false
    return true
  })
  const toggle = (key: 'tags' | 'categories', value: string) => {
    const list = scope[key]
    onScopeChange({ ...scope, [key]: list.includes(value) ? list.filter((item) => item !== value) : [...list, value] })
  }

  const collapsedRail = (
    <button
      type="button"
      onClick={() => onCollapsedChange(false)}
      className="flex h-screen min-h-0 w-full flex-col items-center gap-3 border-l border-border bg-secondary/40 py-4 text-left transition hover:bg-secondary"
      aria-label="Expand references used"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-secondary">
        <PanelRightOpen className="h-4 w-4" />
      </span>
      <div className="flex min-h-0 flex-1 items-center">
        <p className="rotate-180 [writing-mode:vertical-rl] text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">References used</p>
      </div>
      <span className="rounded-full bg-card px-2 py-1 text-[10px] text-muted-foreground ring-1 ring-border">{filteredReferences.length}</span>
    </button>
  )

  const panelContent = (
    <>
      <div className="border-b border-border p-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">References used</h2>
            <p className="mt-1 text-sm text-muted-foreground">Filters check cited Knowledge pages only. Ask always searches all knowledge.</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-full bg-card px-2.5 py-1 text-xs text-muted-foreground ring-1 ring-border">
              {hasFilters ? `${filteredReferences.length}/${references.length}` : references.length}
            </span>
            <Button variant="ghost" size="icon" onClick={() => onCollapsedChange(true)} aria-label="Collapse references used">
              <PanelRightClose className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="grid gap-2">
          <Dropdown className="w-full" triggerClassName="w-full" icon={Tag} label="Tags" options={tags} selected={scope.tags} onToggle={(value) => toggle('tags', value)} prefix="#" />
          <Dropdown className="w-full" triggerClassName="w-full" icon={Layers} label="Categories" options={categories} selected={scope.categories} onToggle={(value) => toggle('categories', value)} badge={<span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"><Sparkles className="h-2.5 w-2.5" />AI</span>} />
        </div>
        {hasFilters && (
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            {scope.categories.map((item) => <FilterChip key={item} onClear={() => toggle('categories', item)}><Layers className="h-3 w-3" />{item}</FilterChip>)}
            {scope.tags.map((item) => <FilterChip key={item} onClear={() => toggle('tags', item)}>#{item}</FilterChip>)}
            <button onClick={() => onScopeChange({ tags: [], categories: [], dateRange: dateOptions[0] })} className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">Clear</button>
          </div>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4">
        {filteredReferences.length ? (
          <ul className="space-y-3">
            {filteredReferences.map((reference) => (
              <li key={`${reference.number}-${reference.id}`}>
                <Card className="p-4">
                  <div className="mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" />Knowledge [{reference.number}]
                  </div>
                  <p className="text-sm text-foreground">{reference.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Knowledge page</p>
                  {((reference.categories?.length ?? 0) > 0 || (reference.tags?.length ?? 0) > 0) && (
                    <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                      {reference.categories?.map((category) => <span key={category} className="rounded-full bg-secondary px-2 py-0.5">{category}</span>)}
                      {reference.tags?.slice(0, 3).map((tag) => <span key={tag} className="rounded-full bg-secondary px-2 py-0.5">#{tag}</span>)}
                    </div>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-4 text-sm leading-relaxed text-muted-foreground">
            {references.length ? 'No cited references match the current filters.' : 'Ask a question to see the references cited in the answer.'}
          </div>
        )}
      </div>
    </>
  )

  if (collapsed) return collapsedRail

  return (
    <>
      <div className="xl:hidden">
        <button className="fixed inset-0 z-40 bg-foreground/20" aria-label="Close references used" onClick={() => onCollapsedChange(true)} />
        <aside className="fixed right-0 top-0 z-50 flex h-screen w-[min(340px,calc(100vw-3.5rem))] min-h-0 flex-col border-l border-border bg-secondary/95 shadow-xl">
          {panelContent}
        </aside>
      </div>
      <aside className="hidden h-screen min-h-0 border-l border-border bg-secondary/40 xl:flex xl:flex-col">
        {panelContent}
      </aside>
    </>
  )
}
