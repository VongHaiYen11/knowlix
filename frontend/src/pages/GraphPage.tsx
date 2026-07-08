import { Skeleton } from '@/components/ui/Skeleton'
import { GraphCanvas } from '@/features/graph/GraphCanvas'
import { useGraphData, useHomeData, useTaxonomy } from '@/hooks/useLibrary'

export function GraphPage() {
  const graph = useGraphData()
  const home = useHomeData()
  const taxonomy = useTaxonomy()
  if (graph.status === 'loading' || home.status === 'loading') return <div className="m-4 h-[calc(100vh-2rem)]"><Skeleton className="h-full" /></div>
  return <GraphCanvas nodes={graph.data.nodes} links={graph.data.links} knowledge={home.data.knowledge} tags={taxonomy.data.tags} categories={taxonomy.data.categories} />
}
