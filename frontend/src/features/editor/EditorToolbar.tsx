import { Bold, Code2, Columns2, Eye, Heading2, ImageIcon, Italic, Link2, List, ListChecks, Pencil, Quote, Sigma, Sparkles, Table as TableIcon, Workflow } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { EditorView } from '@/hooks/useNoteEditor'
import { cn } from '@/utils/cn'

interface EditorToolbarProps {
  view: EditorView
  onView: (view: EditorView) => void
  onInsert: (text: string) => void
  onSurround: (before: string, after?: string) => void
}

export function EditorToolbar({ view, onView, onInsert, onSurround }: EditorToolbarProps) {
  const tools = [
    { icon: Heading2, label: 'Heading', action: () => onInsert('## Heading') },
    { icon: Bold, label: 'Bold', action: () => onSurround('**') },
    { icon: Italic, label: 'Italic', action: () => onSurround('_') },
    { icon: List, label: 'List', action: () => onInsert('- Item') },
    { icon: ListChecks, label: 'Checklist', action: () => onInsert('- [ ] To do') },
    { icon: Quote, label: 'Quote', action: () => onInsert('> Quote') },
    { icon: Code2, label: 'Code block', action: () => onInsert('```ts\n\n```') },
    { icon: TableIcon, label: 'Table', action: () => onInsert('| A | B |\n| --- | --- |\n| 1 | 2 |') },
    { icon: ImageIcon, label: 'Image', action: () => onInsert('![alt text](/placeholder.jpg)') },
    { icon: Link2, label: 'Link', action: () => onSurround('[', '](url)') },
    { icon: Sigma, label: 'Math', action: () => onInsert('$$\n\n$$') },
    { icon: Workflow, label: 'Mermaid', action: () => onInsert('```mermaid\ngraph LR\n  A --> B\n```') },
  ]
  const views = [{ value: 'edit', label: 'Edit', icon: Pencil }, { value: 'split', label: 'Split', icon: Columns2 }, { value: 'preview', label: 'Preview', icon: Eye }] as const

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-border px-3 py-2 md:px-6">
      {tools.map((tool) => <Button key={tool.label} variant="ghost" size="icon" onClick={tool.action} title={tool.label} aria-label={tool.label}><tool.icon className="h-4 w-4" strokeWidth={1.75} /></Button>)}
      <div className="mx-1.5 h-5 w-px bg-border" />
      <Button variant="ghost" size="sm" icon={<Sparkles className="h-4 w-4" />}>Ask assistant</Button>
      <div className="ml-auto inline-flex rounded-lg border border-border bg-card p-0.5">
        {views.map((option) => <button key={option.value} onClick={() => onView(option.value)} className={cn('inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition', view === option.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}><option.icon className="h-3.5 w-3.5" /><span className="hidden sm:inline">{option.label}</span></button>)}
      </div>
    </div>
  )
}
