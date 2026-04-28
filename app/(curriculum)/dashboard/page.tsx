import { getDashboardData } from '@/lib/dashboard-data'
import { LiveSessionCard } from '@/components/dashboard/live-session-card'
import { AnnouncementsFeed } from '@/components/dashboard/announcements-feed'

export const dynamic = 'force-dynamic'

/**
 * Dashboard is now the default right-pane content for the curriculum
 * layout: the tree on the left is the navigation, and this page
 * shows the user a welcome, the next live session, and recent
 * announcements. When the user clicks a content row in the tree the
 * URL changes and the right pane re-renders with the item viewer -
 * the layout (and tree state) stays put.
 */
export default async function DashboardPage() {
  const data = await getDashboardData()

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="font-serif text-3xl text-primary md:text-4xl">
          Welcome back, {data.user.fullName}
        </h1>
        <p className="text-text-muted">
          Pick up where you left off - choose a content item from the
          curriculum on the left.
        </p>
      </header>

      {/* Upcoming live session (only within 7 days). */}
      {data.upcomingSession && <LiveSessionCard session={data.upcomingSession} />}

      <AnnouncementsFeed announcements={data.announcements} />
    </div>
  )
}
