import { AppShell } from '@/components/app-shell'
import { getDashboardData } from '@/lib/dashboard-data'
import { loadFullCurriculum } from '@/lib/curriculum-tree'
import { LiveSessionCard } from '@/components/dashboard/live-session-card'
import { CurriculumTree } from '@/components/curriculum/curriculum-tree'
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
      ? 'No curriculum is published yet'
      : `Reviewing ${phasesCount} phase${phasesCount === 1 ? '' : 's'} of curriculum`
  }
  // fellow
  if (phasesCount === 0) {
    return 'No curriculum has been assigned to your cohort yet'
  }
  return `${phasesCount} phase${phasesCount === 1 ? '' : 's'} available - ${contentCount} item${contentCount === 1 ? '' : 's'} in total`
}

export default async function DashboardPage() {
  // Two parallel loads: dashboard chrome (sessions, announcements,
  // welcome copy) and the full Phase -> Module -> Content tree the
  // collapsible curriculum view renders inline.
  const [data, curriculum] = await Promise.all([
    getDashboardData(),
    loadFullCurriculum(),
  ])
  const totalContent = curriculum.phases.reduce(
    (sum, p) => sum + p.itemCount,
    0,
  )

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
              curriculum.phases.length,
              totalContent,
              data.user.role,
            )}
          </p>
        </div>

        {/* Upcoming live session (only within 7 days). */}
        {data.upcomingSession && (
          <LiveSessionCard session={data.upcomingSession} />
        )}

        {/* Curriculum overview - collapsible tree */}
        <section
          aria-labelledby="curriculum-heading"
          className="space-y-4"
        >
          <div className="flex items-end justify-between">
            <h3
              id="curriculum-heading"
              className="font-serif text-lg text-primary"
            >
              Curriculum
            </h3>
            {curriculum.phases.length > 0 && (
              <span className="text-xs text-text-muted">
                {curriculum.phases.length} phase
                {curriculum.phases.length === 1 ? '' : 's'}
              </span>
            )}
          </div>
          <CurriculumTree phases={curriculum.phases} />
        </section>

        {/* Announcements */}
        <AnnouncementsFeed announcements={data.announcements} />
      </div>
    </AppShell>
  )
}
