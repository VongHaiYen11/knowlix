import { useMemo, useState } from 'react'
import { Plus, Upload } from 'lucide-react'
import { Link } from 'react-router'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { Button } from '@/components/ui/Button'
import { Dropdown } from '@/components/ui/Dropdown'
import { SearchInput } from '@/components/ui/SearchInput'
import { Skeleton } from '@/components/ui/Skeleton'
import { TabPanel, Tabs } from '@/components/ui/Tabs'
import { KnowledgeGrid } from '@/features/library/KnowledgeGrid'
import { SourceList } from '@/features/library/SourceList'
import { ROUTES } from '@/constants/routes'
import { useLibraryKnowledge, useLibrarySources, useTaxonomy } from '@/hooks/useLibrary'
import type { SourceType } from '@/types/knowledge'

type LibraryTab = 'sources' | 'knowledge'

const sourceTypes: Array<SourceType | 'All'> = ['All', 'Note', 'PDF', 'Article', 'Bookmark', 'Image', 'Voice', 'File']

export function LibraryPage() {
  const [tab, setTab] = useState<LibraryTab>('sources')
  const [query, setQuery] = useState('')
  const [sourceType, setSourceType] = useState<SourceType | 'All'>('All')
  const [category, setCategory] = useState('All')
  const [tag, setTag] = useState('All')
  const [sort, setSort] = useState<'updated-desc' | 'created-desc' | 'title-asc' | 'type-asc'>('updated-desc')
  const taxonomy = useTaxonomy()
  const sourceFilters = useMemo(() => ({ query, sourceType, category, tag, sort }), [category, query, sort, sourceType, tag])
  const knowledgeFilters = useMemo(() => ({ query, category, tag, sort }), [category, query, sort, tag])
  const sources = useLibrarySources(sourceFilters)
  const knowledge = useLibraryKnowledge(knowledgeFilters)

  return (
    <PageShell>
      <PageHeader title="Library" description="The center of everything you keep. Raw sources become living knowledge." />
      <SearchInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your library by meaning or words..." aria-label="Search your library" />
      <div className="mt-6">
        <Tabs tabs={[{ value: 'sources', label: 'Source of Truth' }, { value: 'knowledge', label: 'Knowledge' }]} value={tab} onChange={setTab} />
      </div>
      {tab === 'sources' ? (
        <TabPanel>
          <LibraryControls
            mode="sources"
            sourceType={sourceType}
            category={category}
            tag={tag}
            sort={sort}
            categories={taxonomy.categories}
            tags={taxonomy.tags}
            onSourceType={(value) => setSourceType(value as SourceType | 'All')}
            onCategory={setCategory}
            onTag={setTag}
            onSort={setSort}
          />
          {sources.status === 'loading' ? <Skeleton count={4} className="h-32" /> : <SourceList sources={sources.data} />}
        </TabPanel>
      ) : (
        <TabPanel>
          <LibraryControls
            mode="knowledge"
            sourceType={sourceType}
            category={category}
            tag={tag}
            sort={sort}
            categories={taxonomy.categories}
            tags={taxonomy.tags}
            onSourceType={(value) => setSourceType(value as SourceType | 'All')}
            onCategory={setCategory}
            onTag={setTag}
            onSort={setSort}
          />
          {knowledge.status === 'loading' ? <Skeleton count={4} className="h-56" /> : <KnowledgeGrid knowledge={knowledge.data} />}
        </TabPanel>
      )}
    </PageShell>
  )
}

const sortLabels = {
  'updated-desc': 'Recently updated',
  'created-desc': 'Recently created',
  'title-asc': 'Title A-Z',
  'type-asc': 'Type A-Z',
}

function LibraryControls({
  mode,
  sourceType,
  category,
  tag,
  sort,
  categories,
  tags,
  onSourceType,
  onCategory,
  onTag,
  onSort,
}: {
  mode: LibraryTab
  sourceType: SourceType | 'All'
  category: string
  tag: string
  sort: keyof typeof sortLabels
  categories: string[]
  tags: string[]
  onSourceType: (value: string) => void
  onCategory: (value: string) => void
  onTag: (value: string) => void
  onSort: (value: keyof typeof sortLabels) => void
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      {mode === 'sources' ? (
        <>
          <Link to={ROUTES.note('new')} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-3.5 text-sm text-primary-foreground transition hover:opacity-90">
            <Plus className="h-4 w-4" />New Note
          </Link>
          <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3.5 text-sm text-foreground transition hover:border-ring/40">
            <Upload className="h-4 w-4" strokeWidth={1.75} />Upload
            <input type="file" multiple className="hidden" aria-label="Upload source files" />
          </label>
          <Dropdown label="Type" options={sourceTypes} selected={[sourceType]} onToggle={onSourceType} showSelectedCount={false} />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Pages generated and maintained from your sources.</p>
      )}
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <Dropdown label="Category" options={['All', ...categories]} selected={[category]} onToggle={onCategory} showSelectedCount={false} />
        <Dropdown label="Tag" options={['All', ...tags]} selected={[tag]} onToggle={onTag} prefix={tag === 'All' ? '' : '#'} showSelectedCount={false} />
        <select value={sort} onChange={(event) => onSort(event.target.value as keyof typeof sortLabels)} className="h-8 rounded-lg border border-border bg-card px-3 text-xs text-muted-foreground focus:outline-none">
          {Object.entries(sortLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <Button variant="ghost" size="sm" onClick={() => { onSourceType('All'); onCategory('All'); onTag('All'); onSort('updated-desc') }}>Reset</Button>
      </div>
    </div>
  )
}
