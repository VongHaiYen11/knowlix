import { BookOpen, CornerDownLeft, FilePlus2, GitMerge, RefreshCw, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { ResearchMessage } from '@/services/researchService'

const actions = [
  { label: 'Save as Knowledge', icon: BookOpen },
  { label: 'Create Note', icon: FilePlus2 },
  { label: 'Update Existing', icon: RefreshCw },
  { label: 'Merge with Page', icon: GitMerge },
]

interface ConversationProps {
  messages: ResearchMessage[]
  input: string
  onInput: (value: string) => void
  onSend: () => void
}

export function Conversation({ messages, input, onInput, onSend }: ConversationProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="panel-frame space-y-8">
          {messages.map((message) => message.role === 'user' ? (
            <div key={message.id} className="flex justify-end"><p className="max-w-lg rounded-2xl rounded-br-md bg-accent px-4 py-3 text-[15px] leading-relaxed text-accent-foreground">{message.content}</p></div>
          ) : (
            <div key={message.id} className="max-w-2xl">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground"><Sparkles className="h-3.5 w-3.5" />Assistant</div>
              <p className="font-serif text-lg leading-relaxed text-foreground/90">{message.content}</p>
              <div className="mt-4 flex flex-wrap gap-2">{actions.map((action) => <Button key={action.label} variant="outline" size="sm" icon={<action.icon className="h-3.5 w-3.5" />}>{action.label}</Button>)}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="shrink-0 border-t border-border">
        <form onSubmit={(event) => { event.preventDefault(); onSend() }} className="panel-frame flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 transition focus-within:border-ring/40">
          <input value={input} onChange={(event) => onInput(event.target.value)} placeholder="Ask your knowledge a question..." aria-label="Ask your knowledge a question" className="min-w-0 flex-1 bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none" />
          <Button type="submit" size="sm" icon={<CornerDownLeft className="h-3.5 w-3.5" />}>Ask</Button>
        </form>
      </div>
    </div>
  )
}
