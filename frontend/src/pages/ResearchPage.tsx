import { MessageSquarePlus } from 'lucide-react'
import { useSearchParams } from 'react-router'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/Button'
import { Conversation } from '@/features/research/Conversation'
import { EvidencePanel } from '@/features/research/EvidencePanel'
import { ResearchFilters } from '@/features/research/ResearchFilters'
import { useHomeData, useTaxonomy } from '@/hooks/useLibrary'
import { useResearch } from '@/hooks/useResearch'

export function ResearchPage() {
  const [searchParams] = useSearchParams()
  const taxonomy = useTaxonomy()
  const home = useHomeData()
  const research = useResearch(searchParams.get('q') ?? '')

  return (
    <div className="grid h-screen min-h-0 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-h-0 min-w-0 flex-col border-r border-border">
        <div className="border-b border-border">
          <div className="panel-frame">
            <PageHeader
              title="Research"
              description="Ask questions across your Knowledge. Every answer is grounded only in the pages you have built."
              className="mb-0"
              action={<Button variant="outline" icon={<MessageSquarePlus className="h-4 w-4" />} onClick={research.reset}>New thread</Button>}
            />
          </div>
        </div>
        <ResearchFilters tags={taxonomy.tags} categories={taxonomy.categories} scope={research.scope} total={home.data.knowledge.length} scoped={research.scopedKnowledge.length} onScopeChange={research.setScope} />
        <Conversation messages={research.messages} input={research.input} onInput={research.setInput} onSend={research.send} />
      </div>
      <EvidencePanel knowledge={research.scopedKnowledge} />
    </div>
  )
}
