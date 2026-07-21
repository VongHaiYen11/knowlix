import { ArrowDownUp, Brain, CalendarDays, Clock, Layers, MessageSquareText, Search, Tag } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Dropdown } from '@/components/ui/Dropdown'
import { Pagination } from '@/components/ui/Pagination'
import type { ResearchThread } from '@/services/researchService'
import { cn } from '@/utils/cn'

const dateOptions = ['Anytime', 'Past week', 'Past month', 'Past 3 months']
const sortOptions = ['Newest first', 'Oldest first']

interface ResearchHistoryPanelProps {
  threads: ResearchThread[]
  activeThreadId?: string
  tags: string[]
  categories: string[]
  onSelectThread: (id: string) => void
  onOpenSummary: (id: string) => void
}

const formatDate = (value: string) => new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
}).format(new Date(value))

export function ResearchHistoryPanel({ threads, activeThreadId, tags, categories, onSelectThread, onOpenSummary }: ResearchHistoryPanelProps) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState(sortOptions[0])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedDate, setSelectedDate] = useState(dateOptions[0])
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [query, selectedTags, selectedCategories, selectedDate, sort])

  const toggle = (list: string[], value: string, setter: (next: string[]) => void) => {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value])
  }

  const filteredThreads = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return [...threads]
      .filter((thread) => {
        if (normalizedQuery && !thread.title.toLowerCase().includes(normalizedQuery)) return false
        if (selectedTags.length && !selectedTags.some((tag) => thread.scope.tags.includes(tag))) return false
        if (selectedCategories.length && !selectedCategories.some((category) => thread.scope.categories.includes(category))) return false
        if (selectedDate !== dateOptions[0] && thread.scope.dateRange !== selectedDate) return false
        return true
      })
      .sort((a, b) => {
        const difference = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        return sort === sortOptions[0] ? difference : -difference
      })
  }, [query, selectedCategories, selectedDate, selectedTags, sort, threads])

  const paginatedThreads = useMemo(() => {
    return filteredThreads.slice((page - 1) * 6, page * 6)
  }, [filteredThreads, page])

  const totalPages = Math.ceil(filteredThreads.length / 6)

  const hasFilters = query || selectedTags.length || selectedCategories.length || selectedDate !== dateOptions[0]

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <label className="flex min-w-64 flex-1 items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm transition focus-within:border-ring/40">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by chat name"
            className="min-w-0 flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </label>
        <Dropdown icon={ArrowDownUp} label={sort} options={sortOptions} selected={[sort]} onToggle={setSort} showSelectedCount={false} />
        <Dropdown icon={Tag} label="Tags" options={tags} selected={selectedTags} onToggle={(value) => toggle(selectedTags, value, setSelectedTags)} prefix="#" />
        <Dropdown icon={Layers} label="Categories" options={categories} selected={selectedCategories} onToggle={(value) => toggle(selectedCategories, value, setSelectedCategories)} />
        <Dropdown icon={CalendarDays} label={selectedDate} options={dateOptions} selected={[selectedDate]} onToggle={setSelectedDate} showSelectedCount={false} />
        {hasFilters && (
          <button
            onClick={() => {
              setQuery('')
              setSelectedTags([])
              setSelectedCategories([])
              setSelectedDate(dateOptions[0])
            }}
            className="h-8 px-2 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Clear
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-auto flex flex-col justify-between">
        <div className="flex-1">
          {paginatedThreads.length ? (
            <ul className="grid gap-4 md:grid-cols-2">
              {paginatedThreads.map((thread) => (
                <li key={thread.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectThread(thread.id)}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter' && event.key !== ' ') return
                      event.preventDefault()
                      onSelectThread(thread.id)
                    }}
                    className={cn(
                      'group block h-full w-full cursor-pointer text-left',
                      thread.id === activeThreadId && 'text-accent-foreground',
                    )}
                  >
                    <Card className={cn('flex h-full flex-col p-5 transition group-hover:border-ring/40', thread.id === activeThreadId && 'border-primary/40 bg-accent')}>
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground"><MessageSquareText className="h-3.5 w-3.5" />Research chat</span>
                        <span className="text-muted-foreground/40">·</span>
                        <span className="text-xs text-muted-foreground">{thread.messages.length} messages</span>
                        <span className="ml-auto inline-flex items-center gap-1.5">
                          {thread.summary && thread.messages.length > 3 ? (
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(event) => {
                                event.stopPropagation()
                                onOpenSummary(thread.id)
                              }}
                              onKeyDown={(event) => {
                                if (event.key !== 'Enter' && event.key !== ' ') return
                                event.preventDefault()
                                event.stopPropagation()
                                onOpenSummary(thread.id)
                              }}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-background text-primary transition hover:border-ring/40"
                              aria-label={`Open summary for ${thread.title || 'Untitled'}`}
                            >
                              <Brain className="h-3.5 w-3.5" />
                            </span>
                          ) : null}
                          <Badge tone="accent">{thread.scope.dateRange}</Badge>
                        </span>
                      </div>
                      <h2 className="font-serif text-2xl leading-snug tracking-tight">{thread.title || 'Untitled'}</h2>
                      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                        {thread.messages.find((message) => message.role === 'assistant')?.content ?? 'No assistant response yet.'}
                      </p>
                      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-4">
                        {thread.scope.categories.slice(0, 2).map((category) => <Badge key={category} tone="accent"><Layers className="h-2.5 w-2.5" />{category}</Badge>)}
                        {thread.scope.tags.slice(0, 3).map((tag) => <span key={tag} className="text-[11px] text-muted-foreground">#{tag}</span>)}
                        <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Clock className="h-3 w-3" />{formatDate(thread.updatedAt)}</span>
                      </div>
                    </Card>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-4 text-sm leading-relaxed text-muted-foreground">
              No saved chats match these filters.
            </div>
          )}
        </div>
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} className="mt-4 shrink-0" />
      </div>
    </div>
  )
}
