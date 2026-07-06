import { History, MessageSquarePlus, PanelRightClose, PanelRightOpen, PencilLine } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/Button'
import { Conversation } from '@/features/research/Conversation'
import { EvidencePanel } from '@/features/research/EvidencePanel'
import { ResearchHistoryPanel } from '@/features/research/ResearchHistoryPanel'
import { useHomeData, useTaxonomy } from '@/hooks/useLibrary'
import { useResearch } from '@/hooks/useResearch'

export function ResearchPage() {
  const [searchParams] = useSearchParams()
  const [historyOpen, setHistoryOpen] = useState(false)
  const [scopeOpen, setScopeOpen] = useState(true)
  const [renaming, setRenaming] = useState(false)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const taxonomy = useTaxonomy()
  const home = useHomeData()
  const research = useResearch(searchParams.get('q') ?? '')

  useEffect(() => {
    const desktopQuery = window.matchMedia('(min-width: 1280px)')
    const collapseBelowDesktop = (event: MediaQueryListEvent | MediaQueryList) => {
      if (!event.matches) setScopeOpen(false)
    }

    collapseBelowDesktop(desktopQuery)
    desktopQuery.addEventListener('change', collapseBelowDesktop)
    return () => desktopQuery.removeEventListener('change', collapseBelowDesktop)
  }, [])

  return (
    <div className={!historyOpen && scopeOpen ? 'grid h-screen min-h-0 grid-cols-[minmax(0,1fr)_56px] xl:grid-cols-[minmax(0,1fr)_340px]' : !historyOpen ? 'grid h-screen min-h-0 grid-cols-[minmax(0,1fr)_56px]' : 'grid h-screen min-h-0'}>
      <div className="flex min-h-0 min-w-0 flex-col border-r border-border">
        <div className="border-b border-border">
          <div className="px-4 py-5 md:px-6 lg:px-8">
            <PageHeader
              title="Research"
              description="Ask questions across your Knowledge. Every answer is grounded only in the pages you have built."
              className="mb-0"
              action={<div className="flex items-center gap-2">
                <Button variant='outline' icon={<History className="h-4 w-4" />} onClick={() => setHistoryOpen((value) => !value)}>{historyOpen ? 'Current chat' : 'History'}</Button>
                <Button variant="outline" icon={<MessageSquarePlus className="h-4 w-4" />} onClick={research.reset}>New thread</Button>
              </div>}
            />
          </div>
        </div>
        {!historyOpen ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 px-4 py-4 md:px-6 lg:px-8">
              <div className="flex items-center justify-between gap-4 rounded-2xl bg-primary px-4 py-3 text-primary-foreground elevated">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRenaming(true)
                      requestAnimationFrame(() => titleInputRef.current?.select())
                    }}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-primary-foreground transition hover:bg-primary-foreground/10"
                    aria-label="Rename chat"
                  >
                    <PencilLine className="h-4 w-4" />
                  </button>
                  <input
                    ref={titleInputRef}
                    value={research.activeThread?.title ?? ''}
                    onChange={(event) => research.renameThread(event.target.value)}
                    onFocus={() => setRenaming(true)}
                    onBlur={() => setRenaming(false)}
                    placeholder="Untitled research"
                    readOnly={!renaming}
                    className="min-w-0 flex-1 bg-transparent font-serif text-2xl leading-snug tracking-tight text-primary-foreground placeholder:text-primary-foreground/60 focus:outline-none"
                  />
                </div>
                <div className="flex shrink-0 items-center gap-4 text-right text-xs text-primary-foreground/75">
                  <span>{research.messages.length} messages</span>
                  <span>{research.scopedKnowledge.length} sources in scope</span>
                </div>
              </div>
            </div>
            <Conversation messages={research.messages} input={research.input} onInput={research.setInput} onSend={research.send} />
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-hidden px-4 py-5 md:px-6 lg:px-8">
            <ResearchHistoryPanel
              threads={research.threads}
              activeThreadId={research.activeThread?.id}
              tags={taxonomy.tags}
              categories={taxonomy.categories}
              onSelectThread={(id) => {
                research.selectThread(id)
                setHistoryOpen(false)
              }}
            />
          </div>
        )}
      </div>
      {!historyOpen && (
        <EvidencePanel
          knowledge={research.scopedKnowledge}
          tags={taxonomy.tags}
          categories={taxonomy.categories}
          scope={research.scope}
          total={home.data.knowledge.length}
          onScopeChange={research.setScope}
          collapsed={!scopeOpen}
          onCollapsedChange={(collapsed) => setScopeOpen(!collapsed)}
        />
      )}
    </div>
  )
}
