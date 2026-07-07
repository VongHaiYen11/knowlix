import { ArrowLeft, Clock, Pencil, Plus, Sparkles, Tag, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Dropdown } from '@/components/ui/Dropdown'
import { EmptyState } from '@/components/ui/EmptyState'
import { MarkdownPreview } from '@/features/editor/MarkdownPreview'
import { sourceTypeIcon, statusIcon } from '@/features/library/SourceIcon'
import { ROUTES } from '@/constants/routes'
import { useSourceArticle, useTaxonomy } from '@/hooks/useLibrary'
import { apiUrl } from '@/repositories/apiClient'
import { libraryService } from '@/services/libraryService'

export function SourceArticlePage({ id }: { id: string }) {
  const sourceState = useSourceArticle(id)
  const taxonomy = useTaxonomy()
  const navigate = useNavigate()
  const [newTag, setNewTag] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [viewMode, setViewMode] = useState<'original' | 'summary'>('original')
  const source = sourceState.data

  useEffect(() => {
    setNewTag('')
  }, [id])

  async function handleDelete() {
    if (!window.confirm("Bạn có chắc chắn muốn xóa Source of Truth này? Thao tác này cũng sẽ xóa toàn bộ các trang tri thức (knowledge) liên quan và liên kết đồ thị của chúng.")) return
    setDeleting(true)
    try {
      await libraryService.deleteSource(id)
      navigate(ROUTES.library)
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Xóa thất bại')
    } finally {
      setDeleting(false)
    }
  }

  if (sourceState.status === 'loading') return <PageShell variant="wide"><Card className="h-96 animate-pulse" /></PageShell>
  if (!source) return <PageShell variant="readable"><EmptyState title="Source not found" message="This source is not in your local library." /></PageShell>

  const Icon = sourceTypeIcon[source.type]
  const StatusIcon = statusIcon[source.status].icon
  const content = libraryService.sourceToMarkdown(source)

  async function setTags(tags: string[]) {
    await libraryService.saveSourceTags(id, tags)
    await sourceState.reload()
  }

  async function toggleTag(tag: string) {
    const current = sourceState.data
    if (!current) return
    const next = current.tags.includes(tag) ? current.tags.filter((item) => item !== tag) : [...current.tags, tag]
    await setTags(next)
  }

  async function addTag() {
    const current = sourceState.data
    if (!current) return
    const tag = newTag.trim().replace(/^#/, '')
    if (!tag) return
    await setTags([...current.tags, tag])
    setNewTag('')
  }

  return (
    <PageShell variant="wide">
      <Link to={ROUTES.library} className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />Library
      </Link>
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_280px]">
        <article className="min-w-0">
          <div className="mb-6 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 uppercase tracking-wide"><Icon className="h-3.5 w-3.5" />{source.type}</span>
            <span className="text-muted-foreground/40">·</span>
            <span>{source.category}</span>
            <span className="text-muted-foreground/40">·</span>
            <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{source.created}</span>
            <Badge tone="accent"><StatusIcon className="h-3 w-3" />{source.status}</Badge>
          </div>
          <PageHeader title={source.title} className="mb-4" />
          <div className="mt-4 flex flex-wrap gap-1.5">{source.tags.map((tag) => <Badge key={tag}>#{tag}</Badge>)}</div>
          <p className="mt-6 border-l-2 border-primary/40 pl-5 font-serif text-xl italic leading-relaxed text-muted-foreground">{source.excerpt}</p>
          <div className="mt-10">
            {viewMode === 'original' && source.fileId ? (
              <iframe
                src={apiUrl(`/api/v1/files/${source.fileId}`)}
                className="w-full h-[88vh] border border-border rounded-xl bg-card shadow-sm"
                title={source.title}
              />
            ) : (
              <MarkdownPreview content={source.content || 'No summary available.'} />
            )}
          </div>
        </article>
        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <div className="space-y-6">
            {source.fileId && (
              <Button
                variant="outline"
                className="h-10 w-full justify-center gap-2"
                icon={<Sparkles className="h-4 w-4 text-amber-500" />}
                onClick={() => setViewMode(prev => prev === 'original' ? 'summary' : 'original')}
              >
                {viewMode === 'original' ? 'Summary' : 'Original File'}
              </Button>
            )}
            {source.type === 'PDF' ? (
              <Button
                disabled
                className="h-10 w-full justify-center gap-2 bg-primary text-primary-foreground opacity-45 cursor-not-allowed"
                icon={<Pencil className="h-4 w-4" />}
              >
                Edit
              </Button>
            ) : (
              <Link to={ROUTES.sourceEdit(source.id)} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm text-primary-foreground transition hover:opacity-90">
                <Pencil className="h-4 w-4" />Edit
              </Link>
            )}
            <Button
              variant="outline"
              className="h-10 w-full justify-center gap-2 text-destructive border-destructive/40 hover:border-destructive hover:bg-destructive/5"
              icon={<Trash2 className="h-4 w-4" />}
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
            <Card className="p-4">
              <h2 className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground"><Tag className="h-3.5 w-3.5" />Tags</h2>
              <Dropdown label="Assign tags" options={taxonomy.tags} selected={source.tags} onToggle={toggleTag} prefix="#" triggerClassName="w-full justify-between" />
              <div className="mt-3 flex gap-2">
                <input value={newTag} onChange={(event) => setNewTag(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void addTag() }} placeholder="Create tag" className="min-w-0 flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none" />
                <Button variant="outline" size="icon" onClick={addTag} aria-label="Create tag"><Plus className="h-4 w-4" /></Button>
              </div>
            </Card>
            <Card className="p-4">
              <h2 className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground"><Sparkles className="h-3.5 w-3.5" />Source details</h2>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>{source.meta}</p>
                <p className={statusIcon[source.status].className}>{source.status}</p>
              </div>
            </Card>
          </div>
        </aside>
      </div>
    </PageShell>
  )
}
