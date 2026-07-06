import { BookOpen } from 'lucide-react'
import { Link } from 'react-router'
import { Card } from '@/components/ui/Card'
import { ROUTES } from '@/constants/routes'
import type { KnowledgeEntry } from '@/types/knowledge'

export function EvidencePanel({ knowledge }: { knowledge: KnowledgeEntry[] }) {
  return (
    <aside className="hidden min-h-0 bg-secondary/40 lg:block">
      <div className="sticky top-4 m-4">
        <h2 className="mb-4 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Knowledge in scope</h2>
        <ul className="space-y-3">
          {knowledge.map((entry) => (
            <li key={entry.slug}>
              <Link to={ROUTES.knowledge(entry.slug)} className="group block">
                <Card className="p-4 transition hover:border-ring/40">
                  <div className="mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground"><BookOpen className="h-3.5 w-3.5" />{entry.category}</div>
                  <p className="text-sm text-foreground">{entry.title}</p>
                  <p className="mt-1.5 line-clamp-2 border-l-2 border-border pl-2.5 text-xs leading-relaxed text-muted-foreground">{entry.overview}</p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}
