import { type ChangeEvent, useEffect, useMemo, useState } from 'react'
import { ArrowRight, FileText, GitMerge, Plus, Upload, X } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { Button } from '@/components/ui/Button'
import { Dropdown } from '@/components/ui/Dropdown'
import { SearchInput } from '@/components/ui/SearchInput'
import { Skeleton } from '@/components/ui/Skeleton'
import { TabPanel, Tabs } from '@/components/ui/Tabs'
import { KnowledgeGrid } from '@/features/library/KnowledgeGrid'
import { KnowledgeMergeModal } from '@/features/library/KnowledgeMergeModal'
import { SourceList } from '@/features/library/SourceList'
import { ROUTES } from '@/constants/routes'
import { useLibraryKnowledge, useLibraryNotes, useLibrarySources, useTaxonomy } from '@/hooks/useLibrary'
import { libraryService } from '@/services/libraryService'
import type { KnowledgeEntry, NoteItem, SourceType } from '@/types/knowledge'

type LibraryTab = 'sources' | 'knowledge' | 'notes'

const sourceTypes: Array<SourceType | 'All'> = ['All', 'PDF', 'DOCX', 'TXT', 'Markdown']

export function LibraryPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState<LibraryTab>('sources')
  const [query, setQuery] = useState('')
  const [sourceType, setSourceType] = useState<SourceType | 'All'>('All')
  const [category, setCategory] = useState('All')
  const [tag, setTag] = useState('All')
  const [sort, setSort] = useState<'updated-desc' | 'created-desc' | 'title-asc' | 'type-asc'>('updated-desc')
  const taxonomy = useTaxonomy()
  const taxonomyData = taxonomy.data
  const sourceFilters = useMemo(() => ({ query, sourceType, category, tag, sort }), [category, query, sort, sourceType, tag])
  const knowledgeFilters = useMemo(() => ({ query, category, tag, sort }), [category, query, sort, tag])
  const noteFilters = useMemo(() => ({ query, sort }), [query, sort])
  const sources = useLibrarySources(sourceFilters)
  const knowledge = useLibraryKnowledge(knowledgeFilters)
  const notes = useLibraryNotes(noteFilters)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [promotingNoteId, setPromotingNoteId] = useState<string | null>(null)
  const [mergeSelectionMode, setMergeSelectionMode] = useState(false)
  const [selectedKnowledgeSlugs, setSelectedKnowledgeSlugs] = useState<string[]>([])
  const [mergeModalOpen, setMergeModalOpen] = useState(false)

  useEffect(() => {
    const tabParam = searchParams.get('tab')
    const mergeSlug = searchParams.get('merge')
    if (tabParam === 'knowledge' || mergeSlug) setTab('knowledge')
    if (mergeSlug) {
      setMergeSelectionMode(true)
      setSelectedKnowledgeSlugs([mergeSlug])
    }
  }, [searchParams])

  const hasProcessingSource = useMemo(() => {
    return sources.data?.some((source) => source.status === 'Processing') ?? false
  }, [sources.data])

  useEffect(() => {
    if (!hasProcessingSource) return

    const interval = setInterval(async () => {
      try {
        const currentSources = await libraryService.getSources(sourceFilters)
        const stillProcessing = currentSources.some((s) => s.status === 'Processing')
        if (!stillProcessing) {
          clearInterval(interval)
          void Promise.all([sources.reload(), knowledge.reload(), notes.reload()])
        }
      } catch (err) {
        console.error('Failed to poll sources:', err)
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [hasProcessingSource, sourceFilters, sources.reload, knowledge.reload, notes.reload])

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (!files.length) return

    setUploading(true)
    setUploadError(null)
    try {
      await libraryService.uploadSources(files)
      await Promise.all([sources.reload(), knowledge.reload()])
      setTab('sources')
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function promoteNote(id: string) {
    setPromotingNoteId(id)
    try {
      await libraryService.promoteNoteToSource(id)
      await Promise.all([notes.reload(), sources.reload(), knowledge.reload()])
      setTab('sources')
    } finally {
      setPromotingNoteId(null)
    }
  }

  function toggleKnowledgeSelection(slug: string) {
    setSelectedKnowledgeSlugs((current) => current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug])
  }

  function cancelMergeSelection() {
    setMergeSelectionMode(false)
    setSelectedKnowledgeSlugs([])
    setMergeModalOpen(false)
  }

  async function handleMergeApplied(entry: KnowledgeEntry) {
    cancelMergeSelection()
    await Promise.all([knowledge.reload(), taxonomy.reload()])
    navigate(ROUTES.knowledge(entry.slug))
  }

  const selectedKnowledge = useMemo(() => {
    const selected = new Set(selectedKnowledgeSlugs)
    return knowledge.data.filter((entry) => selected.has(entry.slug))
  }, [knowledge.data, selectedKnowledgeSlugs])

  return (
    <PageShell>
      <PageHeader title="Library" description="The center of everything you keep. Raw sources become living knowledge." />
      <SearchInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your library by meaning or words..." aria-label="Search your library" />
      <div className="mt-6">
        <Tabs tabs={[{ value: 'sources', label: 'Source of Truth' }, { value: 'knowledge', label: 'Knowledge' }, { value: 'notes', label: 'Notes' }]} value={tab} onChange={setTab} />
      </div>
      {tab === 'sources' ? (
        <TabPanel>
          <LibraryControls
            mode="sources"
            sourceType={sourceType}
            category={category}
            tag={tag}
            sort={sort}
            categories={taxonomyData.categories}
            tags={taxonomyData.tags}
            uploading={uploading}
            uploadError={uploadError}
            onUpload={handleUpload}
            onSourceType={(value) => setSourceType(value as SourceType | 'All')}
            onCategory={setCategory}
            onTag={setTag}
            onSort={setSort}
          />
          {sources.status === 'loading' ? <Skeleton count={4} className="h-32" /> : <SourceList sources={sources.data} />}
        </TabPanel>
      ) : tab === 'knowledge' ? (
        <TabPanel>
          <LibraryControls
            mode="knowledge"
            mergeSelectionMode={mergeSelectionMode}
            selectedKnowledgeCount={selectedKnowledgeSlugs.length}
            sourceType={sourceType}
            category={category}
            tag={tag}
            sort={sort}
            categories={taxonomyData.categories}
            tags={taxonomyData.tags}
            uploading={uploading}
            uploadError={uploadError}
            onUpload={handleUpload}
            onSourceType={(value) => setSourceType(value as SourceType | 'All')}
            onCategory={setCategory}
            onTag={setTag}
            onSort={setSort}
            onStartMerge={() => setMergeSelectionMode(true)}
            onOpenMerge={() => setMergeModalOpen(true)}
            onCancelMerge={cancelMergeSelection}
          />
          {knowledge.status === 'loading' ? <Skeleton count={4} className="h-56" /> : (
            <KnowledgeGrid
              knowledge={knowledge.data}
              selectionMode={mergeSelectionMode}
              selectedSlugs={selectedKnowledgeSlugs}
              onToggleSelection={toggleKnowledgeSelection}
            />
          )}
          <KnowledgeMergeModal
            open={mergeModalOpen}
            selectedKnowledge={selectedKnowledge}
            onClose={() => setMergeModalOpen(false)}
            onApplied={handleMergeApplied}
          />
        </TabPanel>
      ) : (
        <TabPanel>
          <LibraryControls
            mode="notes"
            sourceType={sourceType}
            category={category}
            tag={tag}
            sort={sort}
            categories={taxonomyData.categories}
            tags={taxonomyData.tags}
            uploading={uploading}
            uploadError={uploadError}
            onUpload={handleUpload}
            onSourceType={(value) => setSourceType(value as SourceType | 'All')}
            onCategory={setCategory}
            onTag={setTag}
            onSort={setSort}
          />
          {notes.status === 'loading' ? <Skeleton count={4} className="h-28" /> : <NoteList notes={notes.data} promotingNoteId={promotingNoteId} onPromote={promoteNote} />}
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
  mergeSelectionMode = false,
  selectedKnowledgeCount = 0,
  sourceType,
  category,
  tag,
  sort,
  categories,
  tags,
  uploading,
  uploadError,
  onUpload,
  onSourceType,
  onCategory,
  onTag,
  onSort,
  onStartMerge,
  onOpenMerge,
  onCancelMerge,
}: {
  mode: LibraryTab
  mergeSelectionMode?: boolean
  selectedKnowledgeCount?: number
  sourceType: SourceType | 'All'
  category: string
  tag: string
  sort: keyof typeof sortLabels
  categories: string[]
  tags: string[]
  uploading: boolean
  uploadError: string | null
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void
  onSourceType: (value: string) => void
  onCategory: (value: string) => void
  onTag: (value: string) => void
  onSort: (value: keyof typeof sortLabels) => void
  onStartMerge?: () => void
  onOpenMerge?: () => void
  onCancelMerge?: () => void
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      {mode === 'sources' ? (
        <>
          <Link to={ROUTES.note('new')} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-3.5 text-sm text-primary-foreground transition hover:opacity-90">
            <Plus className="h-4 w-4" />New Note
          </Link>
          <label className={`inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-3.5 text-sm text-foreground transition hover:border-ring/40 ${uploading ? 'cursor-wait opacity-70' : 'cursor-pointer'}`}>
            <Upload className="h-4 w-4" strokeWidth={1.75} />{uploading ? 'Ingesting...' : 'Upload'}
            <input type="file" multiple accept=".pdf,.docx,.txt,.md,.markdown" className="hidden" aria-label="Upload source files" disabled={uploading} onChange={onUpload} />
          </label>
          {uploadError ? <span className="text-xs text-destructive">{uploadError}</span> : null}
          <Dropdown label="Type" options={sourceTypes} selected={[sourceType]} onToggle={onSourceType} showSelectedCount={false} />
        </>
      ) : mode === 'knowledge' ? (
        mergeSelectionMode ? (
          <>
            <div className="inline-flex h-10 items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3.5 text-sm text-primary">
              <GitMerge className="h-4 w-4" />{selectedKnowledgeCount} selected
            </div>
            <Button size="sm" onClick={onOpenMerge} disabled={selectedKnowledgeCount < 2} icon={<GitMerge className="h-4 w-4" />}>Merge</Button>
            <Button variant="ghost" size="sm" onClick={onCancelMerge} icon={<X className="h-4 w-4" />}>Cancel</Button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">Pages generated and maintained from your sources.</p>
            <Button variant="outline" size="sm" onClick={onStartMerge} icon={<GitMerge className="h-4 w-4" />}>Select to merge</Button>
          </>
        )
      ) : (
        <>
          <Link to={ROUTES.note('new')} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-3.5 text-sm text-primary-foreground transition hover:opacity-90">
            <Plus className="h-4 w-4" />New Note
          </Link>
          <p className="text-sm text-muted-foreground">Private notes stay here until you add them as Source of Truth.</p>
        </>
      )}
      <div className="ml-auto flex flex-wrap items-center gap-2">
        {mode !== 'notes' && (
          <>
            <Dropdown label="Category" options={['All', ...categories]} selected={[category]} onToggle={onCategory} showSelectedCount={false} />
            <Dropdown label="Tag" options={['All', ...tags]} selected={[tag]} onToggle={onTag} prefix={tag === 'All' ? '' : '#'} showSelectedCount={false} />
          </>
        )}
        <select value={sort} onChange={(event) => onSort(event.target.value as keyof typeof sortLabels)} className="h-8 rounded-lg border border-border bg-card px-3 text-xs text-muted-foreground focus:outline-none">
          {Object.entries(sortLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <Button variant="ghost" size="sm" onClick={() => { onSourceType('All'); onCategory('All'); onTag('All'); onSort('updated-desc') }}>Reset</Button>
      </div>
    </div>
  )
}

function NoteList({ notes, promotingNoteId, onPromote }: { notes: NoteItem[]; promotingNoteId: string | null; onPromote: (id: string) => Promise<void> }) {
  if (!notes.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
        <FileText className="mx-auto h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
        <h2 className="mt-3 font-serif text-2xl tracking-tight">No notes yet</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">Create a note for loose thoughts. Nothing is processed unless you add it as Source of Truth.</p>
        <Link to={ROUTES.note('new')} className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-3.5 text-sm text-primary-foreground transition hover:opacity-90">
          <Plus className="h-4 w-4" />New Note
        </Link>
      </div>
    )
  }

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card elevated">
      {notes.map((note) => (
        <li key={note.id} className="grid gap-4 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <Link to={ROUTES.note(note.id)} className="block min-w-0 overflow-hidden">
            <p className="truncate text-[15px] text-foreground">{note.title}</p>
            <p className="mt-1 truncate text-sm leading-relaxed text-muted-foreground">{note.excerpt || 'No preview yet.'}</p>
            <p className="mt-2 text-xs text-muted-foreground">{note.updated} · {note.words} words</p>
          </Link>
          <Button type="button" variant="outline" size="sm" className="justify-self-start whitespace-nowrap sm:justify-self-end" onClick={() => { void onPromote(note.id) }} disabled={promotingNoteId === note.id} icon={<ArrowRight className="h-3.5 w-3.5" />}>
            {promotingNoteId === note.id ? 'Adding...' : 'Add as source of truth'}
          </Button>
        </li>
      ))}
    </ul>
  )
}
