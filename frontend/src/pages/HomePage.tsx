import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { ContinueReading } from '@/features/home/ContinueReading'
import { DailyInspirationCard, JournalToday, RecentNotes } from '@/features/home/HomeSections'
import { HomeSearch } from '@/features/home/HomeSearch'
import { useAuth } from '@/auth/useAuth'
import { useDailyInspiration } from '@/hooks/useDailyInspiration'
import { useHomeData } from '@/hooks/useLibrary'
import { Skeleton } from '@/components/ui/Skeleton'
import { vietnamHour } from '@/utils/vietnamTime'

export function HomePage() {
  const { user } = useAuth()
  const { data, status } = useHomeData()
  const inspiration = useDailyInspiration(user)
  const hour = vietnamHour()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const firstName = user?.name?.trim().split(/\s+/)[0] || 'there'

  return (
    <PageShell>
      <PageHeader title="Welcome Back!" description="Pick up where you left off, search your knowledge, or ask a grounded question across your library." eyebrow={`${greeting}, ${firstName}`} />
      <HomeSearch />
      {status === 'loading' ? (
        <div className="mt-14 grid gap-4 md:grid-cols-2"><Skeleton count={4} className="h-48" /></div>
      ) : (
        <>
          <div className="mt-14 grid items-stretch gap-10 lg:grid-cols-4">
            <ContinueReading knowledge={data.knowledge} />
            <DailyInspirationCard quote={inspiration.quote} loading={inspiration.status === 'loading'} />
          </div>
          <div className="mt-14">
            <RecentNotes notes={data.notes} />
          </div>
          <JournalToday journal={data.journal} />
        </>
      )}
    </PageShell>
  )
}
