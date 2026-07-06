import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { ContinueReading } from '@/features/home/ContinueReading'
import { AssistantSuggestions, JournalAndGraph, RecentNotes } from '@/features/home/HomeSections'
import { HomeSearch } from '@/features/home/HomeSearch'
import { useHomeData } from '@/hooks/useLibrary'
import { Skeleton } from '@/components/ui/Skeleton'

export function HomePage() {
  const { data, status } = useHomeData()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <PageShell>
      <PageHeader title="Welcome Back!" description="Pick up where you left off, search your knowledge, or ask a grounded question across your library." eyebrow={`${greeting}, Eleanor`} />
      <HomeSearch />
      {status === 'loading' ? (
        <div className="mt-14 grid gap-4 md:grid-cols-2"><Skeleton count={4} className="h-48" /></div>
      ) : (
        <>
          <ContinueReading knowledge={data.knowledge} />
          <div className="mt-14 grid gap-10 lg:grid-cols-3">
            <RecentNotes notes={data.notes} />
            <AssistantSuggestions />
          </div>
          <JournalAndGraph journal={data.journal} />
        </>
      )}
    </PageShell>
  )
}
