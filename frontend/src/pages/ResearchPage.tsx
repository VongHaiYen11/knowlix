import { Brain, History, MessageSquarePlus, PencilLine, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Conversation } from '@/features/research/Conversation'
import { EvidencePanel } from '@/features/research/EvidencePanel'
import { ResearchHistoryPanel } from '@/features/research/ResearchHistoryPanel'
import { ResearchSummaryModal } from '@/features/research/ResearchSummaryModal'
import { useTaxonomy } from '@/hooks/useLibrary'
import { useResearch } from '@/hooks/useResearch'

export function ResearchPage() {
  const [searchParams] = useSearchParams()
  const [historyOpen, setHistoryOpen] = useState(false)
  const [scopeOpen, setScopeOpen] = useState(true)
  const [renaming, setRenaming] = useState(false)
  const [summaryThreadId, setSummaryThreadId] = useState<string | null>(null)
  const [deleteThreadId, setDeleteThreadId] = useState<string | null>(null)
  const [deletingThread, setDeletingThread] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const taxonomy = useTaxonomy()
  const taxonomyData = taxonomy.data
  const research = useResearch(searchParams.get('q') ?? '')
  const summaryThread = useMemo(() => {
    if (!summaryThreadId) return undefined
    return research.threads.find((thread) => thread.id === summaryThreadId)
  }, [research.threads, summaryThreadId])
  const assistantThinking = research.messages.some((message) => message.role === 'assistant' && message.content === 'Thinking...')
  const hasEnoughMessagesForSummary = Boolean(research.activeThread) && research.messages.length > 3
  const canSummarizeCurrent = hasEnoughMessagesForSummary && !assistantThinking
  const threadToDelete = deleteThreadId ? research.threads.find((thread) => thread.id === deleteThreadId) : undefined

  async function confirmDeleteThread() {
    if (!deleteThreadId || deletingThread) return
    setDeletingThread(true)
    setDeleteError(null)
    try {
      await research.deleteThread(deleteThreadId)
      if (summaryThreadId === deleteThreadId) setSummaryThreadId(null)
      setDeleteThreadId(null)
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Could not delete this chat')
    } finally {
      setDeletingThread(false)
    }
  }

  async function openCurrentSummary() {
    const thread = research.activeThread
    if (!thread || !canSummarizeCurrent) return
    research.clearSummaryError()
    setSummaryThreadId(thread.id)
    if (!thread.summary) {
      try {
        await research.generateSummary(thread.id)
      } catch {
        // Error is surfaced inside the summary modal.
      }
    }
  }

  async function regenerateSummary() {
    if (!summaryThread) return
    try {
      await research.generateSummary(summaryThread.id)
    } catch {
      // Error is surfaced inside the summary modal.
    }
  }

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
          <div className="page-shell-section">
            <PageHeader
              title="Research"
              description="Chat with your knowledge, get grounded answers, and continue conversations anytime."
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
            <div className="page-shell-section shrink-0">
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
                    placeholder="Untitled"
                    readOnly={!renaming}
                    className="min-w-0 flex-1 bg-transparent font-serif text-2xl leading-snug tracking-tight text-primary-foreground placeholder:text-primary-foreground/60 focus:outline-none"
                  />
                </div>
                <div className="flex shrink-0 items-center gap-4 text-right text-xs text-primary-foreground/75">
                  <span>{research.messages.length} messages</span>
                  <span>{research.usedReferences.length} references used</span>
                </div>
                {hasEnoughMessagesForSummary ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Brain className="h-4 w-4" />}
                    onClick={openCurrentSummary}
                    disabled={!canSummarizeCurrent || research.summaryLoadingThreadId === research.activeThread?.id}
                  >
                    {research.summaryLoadingThreadId === research.activeThread?.id ? 'Summarizing...' : 'Summary'}
                  </Button>
                ) : null}
                {research.activeThread ? (
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteError(null)
                      setDeleteThreadId(research.activeThread?.id ?? null)
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-primary-foreground/75 transition hover:bg-primary-foreground/10 hover:text-primary-foreground"
                    aria-label="Delete current chat"
                    title="Delete chat"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </div>
            <Conversation messages={research.messages} input={research.input} onInput={research.setInput} onSend={research.send} />
          </div>
        ) : (
          <div className="page-shell-section min-h-0 flex-1 overflow-hidden">
            <ResearchHistoryPanel
              threads={research.threads}
              activeThreadId={research.activeThread?.id}
              tags={taxonomyData.tags}
              categories={taxonomyData.categories}
              onSelectThread={(id) => {
                research.selectThread(id)
                setHistoryOpen(false)
              }}
              onOpenSummary={(id) => {
                research.clearSummaryError()
                setSummaryThreadId(id)
              }}
              onDeleteThread={(id) => {
                setDeleteError(null)
                setDeleteThreadId(id)
              }}
            />
          </div>
        )}
      </div>
      {!historyOpen && (
        <EvidencePanel
          references={research.usedReferences}
          tags={taxonomyData.tags}
          categories={taxonomyData.categories}
          scope={research.scope}
          onScopeChange={research.setScope}
          collapsed={!scopeOpen}
          onCollapsedChange={(collapsed) => setScopeOpen(!collapsed)}
        />
      )}
      <ResearchSummaryModal
        open={Boolean(summaryThreadId)}
        thread={summaryThread}
        loading={Boolean(summaryThread && research.summaryLoadingThreadId === summaryThread.id)}
        error={research.summaryError}
        onClose={() => setSummaryThreadId(null)}
        onRegenerate={regenerateSummary}
      />
      <ConfirmDialog
        open={Boolean(deleteThreadId)}
        title="Delete chat?"
        message={`This permanently deletes "${threadToDelete?.title || 'Untitled'}" and its messages.`}
        confirmLabel="Delete chat"
        error={deleteError}
        loading={deletingThread}
        onConfirm={() => void confirmDeleteThread()}
        onCancel={() => {
          if (deletingThread) return
          setDeleteThreadId(null)
          setDeleteError(null)
        }}
      />
    </div>
  )
}
