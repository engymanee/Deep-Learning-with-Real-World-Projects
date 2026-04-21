import { AppShell } from '@/components/app-shell'
import { getDashboardData } from '@/lib/dashboard-data'
import { ResumeCard } from '@/components/dashboard/resume-card'
import { StartYearCard } from '@/components/dashboard/start-year-card'
import { LiveSessionCard } from '@/components/dashboard/live-session-card'
import { ProgressColumn } from '@/components/dashboard/progress-column'
import { TeamColumn } from '@/components/dashboard/team-column'
import { AnnouncementsFeed } from '@/components/dashboard/announcements-feed'

// Always fetch fresh dashboard data per request - progress, sessions, and
// announcements all change frequently and should never be statically cached.
export const dynamic = 'force-dynamic'

const YEAR_WORDS: Record<number, string> = {
  1: 'One',
  2: 'Two',
  3: 'Three',
}

/**
 * Renders the dashboard welcome subtitle for a learner's current stage.
 * Covers every state a Fellow can be in - from brand new to
 * program-complete.
 */
function getWelcomeSubtitle(
  position: { year: number; currentLab: number; totalLabs: number },
  years: Array<{ orderIndex: number; title: string }>,
  isNewLearner: boolean,
): string {
  if (isNewLearner) {
    return "You're just getting started on your leadership journey"
  }

  // Program complete.
  if (position.year > years.length) {
    return "You've completed the Wisdom At Work Fellowship - congratulations"
  }

  const currentYear = years.find((y) => y.orderIndex === position.year)
  const yearWord = YEAR_WORDS[position.year] ?? String(position.year)
  const yearLabel = currentYear ? currentYear.title : `Year ${yearWord}`

  return `You're in ${yearLabel}, Lab ${position.currentLab} of ${position.totalLabs}`
}

export default async function DashboardPage() {
  const data = await getDashboardData()

  return (
    <AppShell showSidebar>
      <div className="space-y-8">
        {/* Welcome Header */}
        <div className="space-y-2">
          <h1 className="font-serif text-4xl text-primary">
            Welcome back, {data.user.fullName}
          </h1>
          <p className="text-text-muted">
            {getWelcomeSubtitle(data.position, data.years, data.isNewLearner)}
          </p>
        </div>

        {/* Primary CTA: Resume if in-progress, Start if brand new. */}
        {data.resume ? (
          <ResumeCard resume={data.resume} />
        ) : (
          <StartYearCard
            yearTitle={data.years[0]?.title ?? 'Year One'}
            startLabId={data.startLabId}
          />
        )}

        {/* Upcoming live session (only within 7 days). */}
        {data.upcomingSession && (
          <LiveSessionCard session={data.upcomingSession} />
        )}

        {/* Two-column: Your progress / Your team */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <ProgressColumn years={data.years} />
          <TeamColumn team={data.team} />
        </div>

        {/* Announcements */}
        <AnnouncementsFeed announcements={data.announcements} />
      </div>
    </AppShell>
  )
}
