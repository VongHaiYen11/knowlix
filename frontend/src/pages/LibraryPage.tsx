import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { SearchInput } from '@/components/ui/SearchInput'
import { Skeleton } from '@/components/ui/Skeleton'
import { TabPanel, Tabs } from '@/components/ui/Tabs'
import { KnowledgeGrid } from '@/features/library/KnowledgeGrid'
import { LibraryToolbar } from '@/features/library/LibraryToolbar'
import { SourceList } from '@/features/library/SourceList'
import { useLibraryKnowledge, useLibrarySources, useTaxonomy } from '@/hooks/useLibrary'
import type { SourceType } from '@/types/knowledge'

type LibraryTab = 'sources' | 'knowledge'

const sourceTypes: Array<SourceType | 'All'> = ['All', 'Note', 'PDF', 'Article', 'Bookmark', 'Image', 'Voice', 'File']

export function LibraryPage() {
  const [tab, setTab] = useState<LibraryTab>('sources')
  const [query, setQuery] = useState('')
  const [sourceType, setSourceType] = useState<SourceType | 'All'>('All')
  const [category, setCategory] = useState('All')
  const taxonomy = useTaxonomy()
  const sourceFilters = useMemo(() => ({ query, sourceType }), [query, sourceType])
  const knowledgeFilters = useMemo(() => ({ query, category }), [category, query])
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
          <LibraryToolbar values={sourceTypes} active={sourceType} onChange={(value) => setSourceType(value as SourceType | 'All')} sourcesMode />
          {sources.status === 'loading' ? <Skeleton count={4} className="h-32" /> : <SourceList sources={sources.data} />}
        </TabPanel>
      ) : (
        <TabPanel>
          <LibraryToolbar values={['All', ...taxonomy.categories]} active={category} onChange={setCategory} description="Pages generated and maintained from your sources." />
          {knowledge.status === 'loading' ? <Skeleton count={4} className="h-56" /> : <KnowledgeGrid knowledge={knowledge.data} />}
        </TabPanel>
      )}
    </PageShell>
  )
}
