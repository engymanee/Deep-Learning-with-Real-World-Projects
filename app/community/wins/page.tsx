import { requireUser } from '@/lib/auth-server'
import { Star, TrendingUp, Award, Calendar } from 'lucide-react'
import { FeedSearchBar } from '@/components/community/feed-search-bar'
import { WinsDirectory } from '@/components/community/wins-directory'
import { SectionHeader } from '@/components/community/section-header'
import { getSectionBySlug } from '@/lib/community/sections'
import { loadSectionPosts } from '@/lib/community/load-section'
import { loadMyResourcesPwfProtocols } from '@/lib/community/load-my-pwf-protocols'
import {
  loadWinsStats,
  loadWinsByFramework,
  loadWinsOverTime,
  loadRecentWins,
} from '@/lib/community/load-wins'
import { WinsDashboard } from '@/components/community/wins-dashboard'

export const metadata = {
  title: 'Wins & Progress | Community | Leadership Fellowship',
}

interface PageProps {
  searchParams: Promise<{ q?: string | string[] }>
}

/**
 * /community/wins - Celebrations of how schools are applying the
 * framework. Includes analytics dashboard showing stats, framework
 * breakdowns, and trends over time. Open to every authenticated user.
 */
export default async function WinsPage({ searchParams }: PageProps) {
  const user = await requireUser()
  const sp = await searchParams
  const rawQ = Array.isArray(sp.q) ? sp.q[0] : sp.q
  const query = (rawQ ?? '').trim()

  const section = getSectionBySlug('wins')!

  const [
    posts,
    frameworks,
    stats,
    frameworkStats,
    winsOverTime,
    recentWins,
  ] = await Promise.all([
    loadSectionPosts('wins', { query: query || undefined }),
    loadMyResourcesPwfProtocols(),
    loadWinsStats(),
    loadWinsByFramework(),
    loadWinsOverTime(6),
    loadRecentWins(5),
  ])

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        section={section}
        count={posts.length}
        canPost={true}
        frameworks={frameworks}
        requireStarRating
        requireVisibilitySettings
      />

      {/* Analytics Dashboard */}
      <WinsDashboard
        stats={stats}
        frameworkStats={frameworkStats}
        winsOverTime={winsOverTime}
        recentWins={recentWins}
      />

      {/* Wins Directory with Filtering */}
      <div className="border-t border-border pt-6">
        <WinsDirectory wins={posts} />
      </div>
    </div>
  )
}
