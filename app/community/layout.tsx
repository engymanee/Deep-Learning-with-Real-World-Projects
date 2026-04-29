import { TopBar } from '@/components/top-bar'
import { CommunitySidebar } from '@/components/community/community-sidebar'
import { requireUser } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase/server'
import { COMMUNITY_SECTIONS } from '@/lib/community/sections'

export const metadata = {
  title: 'Community | Leadership Fellowship',
  description:
    'Fellow bios, announcements, reflections, wins, and peer Q&A across the Fellowship.',
}

/**
 * /community layout - persistent shell shared by every nested route.
 *
 * Renders:
 *   1. TopBar (same as the rest of the app)
 *   2. The Community sidebar (Overview + 5 sections), with counts
 *   3. The active route's content as `children`
 *
 * Counts are computed once at the layout level so each section page
 * doesn't have to re-query "how many wins exist?". They surface as
 * the small numeric pills next to each sidebar entry.
 *
 * Caching note: requireUser() and the Supabase client are both
 * request-scoped, so calling requireUser() here AND in each child
 * page costs only one round-trip thanks to React's per-request
 * cache().
 */
export default async function CommunityLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireUser()
  const supabase = await createClient()

  // Bios count = active fellows + facilitators.
  const biosPromise = supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .in('role', ['fellow', 'facilitator'])
    .is('deactivated_at', null)

  // Per-section published-post counts. Each section's `postKinds`
  // covers any legacy aliases (e.g. reflections includes 'story').
  const postSections = COMMUNITY_SECTIONS.filter((s) => s.postKinds !== null)
  const postCountPromises = postSections.map((s) =>
    supabase
      .from('community_posts')
      .select('id', { count: 'exact', head: true })
      .in('kind', s.postKinds as string[])
      .not('published_at', 'is', null),
  )

  const [biosRes, ...postRes] = await Promise.all([
    biosPromise,
    ...postCountPromises,
  ])

  const counts: Record<string, number> = { bios: biosRes.count ?? 0 }
  postSections.forEach((s, i) => {
    counts[s.id] = postRes[i].count ?? 0
  })

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:py-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          <CommunitySidebar counts={counts} />
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </div>
  )
}
