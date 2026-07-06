import { CalendarDays, Layers, Sparkles, Tag } from 'lucide-react'
import { Dropdown } from '@/components/ui/Dropdown'
import { FilterChip } from './FilterChip'
import type { ResearchScope } from '@/services/researchService'

const dateOptions = ['Any time', 'Past week', 'Past month', 'Past 3 months']

interface ResearchFiltersProps {
  tags: string[]
  categories: string[]
  scope: ResearchScope
  total: number
  scoped: number
  onScopeChange: (scope: ResearchScope) => void
}

export function ResearchFilters({ tags, categories, scope, total, scoped, onScopeChange }: ResearchFiltersProps) {
  const hasFilters = scope.tags.length > 0 || scope.categories.length > 0 || scope.dateRange !== dateOptions[0]
  const toggle = (key: 'tags' | 'categories', value: string) => {
    const list = scope[key]
    onScopeChange({ ...scope, [key]: list.includes(value) ? list.filter((item) => item !== value) : [...list, value] })
  }

  return (
    <div className="border-b border-border bg-secondary/40">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 md:px-6 lg:px-8">
        <Dropdown icon={Tag} label="Tags" options={tags} selected={scope.tags} onToggle={(value) => toggle('tags', value)} prefix="#" />
        <Dropdown icon={Layers} label="Categories" options={categories} selected={scope.categories} onToggle={(value) => toggle('categories', value)} badge={<span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"><Sparkles className="h-2.5 w-2.5" />AI</span>} />
        <Dropdown icon={CalendarDays} label={scope.dateRange === 'Any time' ? 'Created' : scope.dateRange} options={dateOptions} selected={[scope.dateRange]} onToggle={(value) => onScopeChange({ ...scope, dateRange: value })} />
        <span className="ml-auto text-xs text-muted-foreground">{scoped} of {total} pages in scope</span>
      </div>
      {hasFilters && (
        <div className="flex flex-wrap items-center gap-1.5 px-4 pb-3 md:px-6 lg:px-8">
          {scope.categories.map((item) => <FilterChip key={item} onClear={() => toggle('categories', item)}><Layers className="h-3 w-3" />{item}</FilterChip>)}
          {scope.tags.map((item) => <FilterChip key={item} onClear={() => toggle('tags', item)}>#{item}</FilterChip>)}
          {scope.dateRange !== dateOptions[0] && <FilterChip onClear={() => onScopeChange({ ...scope, dateRange: dateOptions[0] })}><CalendarDays className="h-3 w-3" />{scope.dateRange}</FilterChip>}
          <button onClick={() => onScopeChange({ tags: [], categories: [], dateRange: dateOptions[0] })} className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">Clear all</button>
        </div>
      )}
    </div>
  )
}
