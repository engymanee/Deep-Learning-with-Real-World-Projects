import { getDashboardData } from '@/lib/dashboard-data'
import { loadTeamProgress } from '@/lib/team-progress'
import { LiveSessionCard } from '@/components/dashboard/live-session-card'
import { AnnouncementsFeed } from '@/components/dashboard/announcements-feed'
import { PhaseProgressSection } from '@/components/dashboard/phase-progress-section'

export const dynamic = 'force-dynamic'

/**
 * Dashboard right pane. The curriculum tree on the left is the
 * primary navigation; this page surfaces:
 *
 *   1. A short welcome
 *   2. Pinned/recent announcements
 *   3. The next live session (when one is within 7 days)
 *   4. Per-phase progress meters - the user's own meter on top of
 *      their cohort teammates' meters, so fellows can see how their
 *      pace compares
 *
 * Both loaders run in parallel; `loadTeamProgress` reuses the cached
 * `loadFullCurriculum` from the layout, so this is one extra round
 * trip for teammate completion rows on top of what the layout
 * already fetches.
 */
export default async function DashboardPage() {
  const [data, teamProgress] = await Promise.all([
    getDashboardData(),
    loadTeamProgress(),
  ])

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="font-serif text-3xl text-primary md:text-4xl">
          Welcome back, {data.user.fullName}
        </h1>
        <p className="text-muted-foreground">
          Pick up where you left off - choose a content item from the
          curriculum on the left.
        </p>
      </header>

      {/* Announcements pinned at the top of the page. */}
      <AnnouncementsFeed announcements={data.announcements} />

      {/* Upcoming live session (only within 7 days). */}
      {data.upcomingSession && <LiveSessionCard session={data.upcomingSession} />}

      {/* Per-phase progress meters: you + your cohort teammates. */}
      <PhaseProgressSection
        phases={teamProgress.phases}
        meName={data.user.fullName}
        teammateCount={teamProgress.teammateCount}
      />
    </div>
  )
}
