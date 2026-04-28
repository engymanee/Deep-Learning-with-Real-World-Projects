import { AppShell } from '@/components/app-shell'
import { getDashboardData } from '@/lib/dashboard-data'
import { LiveSessionCard } from '@/components/dashboard/live-session-card'
import { CurriculumList } from '@/components/dashboard/curriculum-list'
import { AnnouncementsFeed } from '@/components/dashboard/announcements-feed'

export const dynamic = 'force-dynamic'

function getWelcomeSubtitle(
  phasesCount: number,
  contentCount: number,
  role: string,
): string {
  if (role === 'admin') {
    return phasesCount === 0
      ? "You're administering the program - start by creating phases under Curriculum"
      : `Administering ${phasesCount} phase${phasesCount === 1 ? '' : 's'} of curriculum`
  }
  if (role === 'facilitator') {
    return phasesCount === 0
      ? "No curriculum is published yet"
      : `Reviewing ${phasesCount} phase${phasesCount === 1 ? '' : 's'} of curriculum`
  }
  // fellow
  if (phasesCount === 0) {
    return "No curriculum has been assigned to your cohort yet"
  }
  return `${phasesCount} phase${phasesCount === 1 ? '' : 's'} available - ${contentCount} item${contentCount === 1 ? '' : 's'} in total`
}

export default async function DashboardPage() {
  const data = await getDashboardData()
  const totalContent = data.phases.reduce((sum, p) => sum + p.contentCount, 0)

  return (
    <AppShell showSidebar>
      <div className="space-y-8">
        {/* Welcome */}
        <div className="space-y-2">
          <h1 className="font-serif text-4xl text-primary">
            Welcome back, {data.user.fullName}
          </h1>
          <p className="text-text-muted">
            {getWelcomeSubtitle(
              data.phases.length,
              totalContent,
              data.user.role,
            )}
          </p>
        </div>

        {/* Upcoming live session (only within 7 days). */}
        {data.upcomingSession && (
          <LiveSessionCard session={data.upcomingSession} />
        )}

        {/* Curriculum overview */}
        <CurriculumList phases={data.phases} />

        {/* Announcements */}
        <AnnouncementsFeed announcements={data.announcements} />
      </div>
    </AppShell>
  )
}
