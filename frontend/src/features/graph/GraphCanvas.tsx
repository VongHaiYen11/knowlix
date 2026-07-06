import { ArrowRight, Maximize2, Search, Sparkles, ZoomIn, ZoomOut } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { PageHeader } from '@/components/common/PageHeader'
import { Dropdown } from '@/components/ui/Dropdown'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { GRAPH_CANVAS } from '@/constants/app'
import { ROUTES } from '@/constants/routes'
import { categoryColors } from '@/theme/colors'
import type { GraphLink, GraphNode, KnowledgeEntry } from '@/types/knowledge'

interface GraphCanvasProps {
  nodes: GraphNode[]
  links: GraphLink[]
  knowledge: KnowledgeEntry[]
  tags: string[]
  categories: string[]
}

export function GraphCanvas({ nodes, links, knowledge, tags, categories }: GraphCanvasProps) {
  const navigate = useNavigate()
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [query, setQuery] = useState('')
  const [tagFilter, setTagFilter] = useState<string[]>([])
  const [categoryFilter, setCategoryFilter] = useState<string[]>([])
  const [focus, setFocus] = useState<string | null>(null)
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)

  const positioned = useMemo(() => nodes.map((node) => ({ ...node, px: node.x * GRAPH_CANVAS.width, py: node.y * GRAPH_CANVAS.height })), [nodes])
  const neighbors = useMemo(() => {
    const map = new Map<string, Set<string>>(nodes.map((node) => [node.id, new Set<string>()]))
    links.forEach((link) => { map.get(link.source)?.add(link.target); map.get(link.target)?.add(link.source) })
    return map
  }, [links, nodes])

  const isDimmed = (id: string) => {
    const node = nodes.find((item) => item.id === id)
    if (!node) return true
    if (categoryFilter.length && !categoryFilter.includes(node.category)) return true
    if (tagFilter.length && !tagFilter.some((tag) => node.tags.includes(tag))) return true
    if (query.trim() && !node.label.toLowerCase().includes(query.toLowerCase())) return true
    return Boolean(focus && id !== focus && !neighbors.get(focus)?.has(id))
  }

  const focusedEntry = focus ? knowledge.find((entry) => entry.slug === focus) : null
  const toggle = (list: string[], value: string, set: (value: string[]) => void) => set(list.includes(value) ? list.filter((item) => item !== value) : [...list, value])

  return (
    <div className="flex h-screen min-h-0 flex-col">
      <div className="border-b border-border">
        <div className="panel-frame">
          <PageHeader
            title="Graph"
            description={`The shape of your knowledge - ${nodes.length} pages, ${links.length} links`}
            className="mb-4"
            action={
              <div className="inline-flex rounded-xl border border-border bg-card p-1 elevated">
                <Button variant="ghost" size="icon" onClick={() => setScale((value) => Math.max(0.5, value - 0.2))} aria-label="Zoom out"><ZoomOut className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => setScale((value) => Math.min(2.5, value + 0.2))} aria-label="Zoom in"><ZoomIn className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); setFocus(null) }} aria-label="Reset view"><Maximize2 className="h-4 w-4" /></Button>
              </div>
            }
          />
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a page..." aria-label="Search graph" className="w-48 bg-transparent text-sm focus:outline-none" />
            </div>
            <Dropdown label="Tags" options={tags} selected={tagFilter} onToggle={(value) => toggle(tagFilter, value, setTagFilter)} prefix="#" />
            <Dropdown label="Categories" options={categories} selected={categoryFilter} onToggle={(value) => toggle(categoryFilter, value, setCategoryFilter)} />
          </div>
        </div>
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden bg-secondary/30">
        <svg className="h-full w-full cursor-grab touch-none active:cursor-grabbing" viewBox={`0 0 ${GRAPH_CANVAS.width} ${GRAPH_CANVAS.height}`} onWheel={(event) => { event.preventDefault(); setScale((value) => Math.min(2.5, Math.max(0.5, value - event.deltaY * 0.0015))) }} onPointerDown={(event) => { drag.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y } }} onPointerMove={(event) => { if (!drag.current) return; setOffset({ x: drag.current.ox + event.clientX - drag.current.x, y: drag.current.oy + event.clientY - drag.current.y }) }} onPointerUp={() => { drag.current = null }}>
          <g transform={`translate(${offset.x} ${offset.y}) scale(${scale})`}>
            {links.map((link) => {
              const source = positioned.find((node) => node.id === link.source)
              const target = positioned.find((node) => node.id === link.target)
              if (!source || !target) return null
              const dimmed = isDimmed(link.source) || isDimmed(link.target)
              return <line key={`${link.source}-${link.target}`} x1={source.px} y1={source.py} x2={target.px} y2={target.py} stroke="var(--border)" strokeWidth={dimmed ? 1 : 1.75} opacity={dimmed ? 0.35 : 0.9} />
            })}
            {positioned.map((node) => {
              const dimmed = isDimmed(node.id)
              const color = categoryColors[node.category] ?? 'var(--primary)'
              const degree = neighbors.get(node.id)?.size ?? 1
              const radius = 14 + degree * 3
              return <g key={node.id} transform={`translate(${node.px} ${node.py})`} opacity={dimmed ? 0.3 : 1} onClick={() => setFocus((value) => value === node.id ? null : node.id)} onDoubleClick={() => navigate(ROUTES.knowledge(node.id))} className="cursor-pointer"><circle r={focus === node.id ? radius + 7 : radius} fill={focus === node.id ? 'none' : color} stroke={color} strokeWidth={focus === node.id ? 1.5 : 0} /><circle r={radius} fill={color} stroke="var(--background)" strokeWidth={2.5} /><text y={radius + 16} textAnchor="middle" fill="var(--foreground)" fontSize={13}>{node.label}</text></g>
            })}
          </g>
        </svg>
        <Card className="absolute bottom-4 left-4 bg-card/90 px-4 py-3 backdrop-blur-sm"><p className="mb-2 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Categories</p>{categories.map((category) => <p key={category} className="flex items-center gap-2 text-xs"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: categoryColors[category] }} />{category}</p>)}</Card>
        {focusedEntry && <Card className="absolute right-4 top-4 w-72 p-5"><h2 className="font-serif text-xl leading-snug tracking-tight">{focusedEntry.title}</h2><p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{focusedEntry.overview}</p><Link to={ROUTES.knowledge(focusedEntry.slug)} className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">Open page<ArrowRight className="h-3.5 w-3.5" /></Link></Card>}
        <div className="pointer-events-none absolute bottom-4 right-4 hidden items-center gap-1.5 rounded-lg bg-card/80 px-3 py-1.5 text-[11px] text-muted-foreground backdrop-blur-sm sm:flex"><Sparkles className="h-3 w-3" />Click to focus · double-click to open · drag to pan · scroll to zoom</div>
      </div>
    </div>
  )
}
