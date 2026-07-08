import { ArrowLeft, Clock, Download, ExternalLink, FileStack, History, Link2, Pencil, RefreshCw, Sparkles } from 'lucide-react'
import { Link } from 'react-router'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { ArticleSection, TimelineList } from '@/features/article/ArticleBlocks'
import { MarkdownPreview } from '@/features/editor/MarkdownPreview'
import { sourceTypeIcon } from '@/features/library/SourceIcon'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import boredImage from '@/assets/bored.png'
import { ROUTES } from '@/constants/routes'
import { useKnowledgeArticle } from '@/hooks/useLibrary'

const actions = [
  { label: 'View Sources', icon: FileStack },
  { label: 'Regenerate', icon: RefreshCw },
  { label: 'Export', icon: Download },
]

export function KnowledgeArticlePage({ slug }: { slug: string }) {
  const { data: entry, status } = useKnowledgeArticle(slug)
  if (status === 'loading') return <PageShell variant="wide"><Card className="h-96 animate-pulse" /></PageShell>
  if (!entry) return <PageShell variant="readable"><EmptyState image imageSrc={boredImage} icon={Sparkles} title="Page not found" message="This knowledge page is not in your local library." /></PageShell>

  return (
    <PageShell variant="wide">
      <Link to={ROUTES.library} className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />Library
      </Link>
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_280px]">
        <article className="min-w-0">
          <div className="mb-6 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="uppercase tracking-wide">{entry.category}</span>
            <span className="text-muted-foreground/40">·</span>
            <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{entry.readTime}</span>
            <Badge tone="accent"><Sparkles className="h-3 w-3" />AI-maintained</Badge>
          </div>
          <PageHeader title={entry.title} className="mb-4" />
          <div className="mt-4 flex flex-wrap gap-1.5">{entry.tags.map((tag) => <Badge key={tag}>#{tag}</Badge>)}</div>
          <p className="mt-6 border-l-2 border-primary/40 pl-5 font-serif text-xl italic leading-relaxed text-muted-foreground">{entry.overview}</p>
          {entry.content ? (
            <div className="mt-10"><MarkdownPreview content={entry.content} /></div>
          ) : (
            <>
              <ArticleSection title="Key ideas">
                <ul className="space-y-2.5">{entry.keyIdeas.map((idea) => <li key={idea} className="flex gap-3 text-[17px] leading-relaxed"><span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" /><span>{idea}</span></li>)}</ul>
              </ArticleSection>
              <ArticleSection title="Explanation"><div className="space-y-4">{entry.explanation.map((text) => <p key={text} className="text-[17px] leading-relaxed text-foreground/90">{text}</p>)}</div></ArticleSection>
              <ArticleSection title="Examples"><div className="space-y-4">{entry.examples.map((example) => <Card key={example.title} className="p-5"><p className="font-serif text-lg leading-snug tracking-tight">{example.title}</p><p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">{example.body}</p></Card>)}</div></ArticleSection>
            </>
          )}
          <ArticleSection title="Source materials">
            <ul className="grid gap-3 sm:grid-cols-2">
              {entry.sources.map((source) => {
                const Icon = sourceTypeIcon[source.type]
                return (
                  <li key={source.id}>
                    <Link
                      to={ROUTES.source(source.id)}
                      className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 elevated hover:border-ring/40 transition-colors duration-200"
                    >
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                        <Icon className="h-4 w-4" strokeWidth={1.75} />
                      </span>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{source.type}</p>
                        <p className="mt-0.5 text-sm font-medium leading-snug hover:text-primary transition-colors">{source.title}</p>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </ArticleSection>
          <ArticleSection title="Timeline"><TimelineList items={entry.timeline} /></ArticleSection>
        </article>
        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <div className="space-y-3">
            <Link to={ROUTES.knowledgeEdit(entry.slug)} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm text-primary-foreground transition hover:opacity-90">
              <Pencil className="h-4 w-4" />Edit
            </Link>
            <div className="grid grid-cols-2 gap-2">{actions.map((action) => <Button key={action.label} variant="outline" size="sm" icon={<action.icon className="h-3.5 w-3.5" />}>{action.label}</Button>)}</div>
            <Card className="p-4"><h2 className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground"><Link2 className="h-3.5 w-3.5" />Related knowledge</h2>{entry.related.map((item) => <p key={item.slug} className="rounded-lg px-2 py-1.5 text-sm text-foreground">{item.title}</p>)}</Card>
            <Card className="p-4"><h2 className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground"><History className="h-3.5 w-3.5" />Last updated</h2><p className="text-sm text-muted-foreground">{entry.updated}</p></Card>
          </div>
        </aside>
      </div>
    </PageShell>
  )
}
