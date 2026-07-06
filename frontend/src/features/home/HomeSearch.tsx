import { CornerDownLeft, Search } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/Button'
import { ROUTES } from '@/constants/routes'

const prompts = ['What do I know about memory?', 'Summarize my notes on attention', 'Connect my journal to my knowledge']

export function HomeSearch() {
  const [value, setValue] = useState('')
  const navigate = useNavigate()

  function submit(query: string) {
    const trimmed = query.trim()
    navigate(trimmed ? `${ROUTES.research}?q=${encodeURIComponent(trimmed)}` : ROUTES.research)
  }

  return (
    <div>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          submit(value)
        }}
        className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 transition focus-within:border-ring/40"
      >
        <Search className="h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
        <input value={value} onChange={(event) => setValue(event.target.value)} placeholder="Ask anything about your knowledge..." aria-label="Ask anything about your knowledge" className="min-w-0 flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none" />
        <Button type="submit" size="sm" icon={<CornerDownLeft className="h-3.5 w-3.5" />} className="hidden sm:inline-flex">Ask</Button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        {prompts.map((prompt) => (
          <button key={prompt} onClick={() => submit(prompt)} className="rounded-full border border-border bg-card px-3.5 py-1.5 text-xs text-muted-foreground transition hover:border-ring/30 hover:text-foreground">
            {prompt}
          </button>
        ))}
      </div>
    </div>
  )
}
