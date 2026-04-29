import { redirect } from 'next/navigation'
import { Users } from 'lucide-react'
import { requireUser } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase/server'
import { TopBar } from '@/components/top-bar'
import { TeamDirectory } from '@/components/team/team-directory'
import type { DirectoryProfile } from '@/lib/types/profile'

export const metadata = {
  title: 'My Team | Leadership Fellowship',
  description:
    'See the colleagues you are working alongside in the Leadership Fellowship.',
}

/**
 * /team route - "My Team" directory.
 *
 * Shows everyone in the current user's school (their team) along
 * with photo, role, cohort, title, and a click-to-open profile
 * modal. Cohort filter is rendered inside the client directory
 * island only when the team has more than one cohort.
 *
 * Auth assumptions:
 *  - requireUser redirects to /auth/login if no session.
 *  - Users without a school assignment can't have a "team" yet, so
 *    we redirect them to /community where they can still find peers.
 */
export default async function TeamPage() {
  const user = await requireUser()

  if (!user.schoolTeamId) {
    redirect('/community')
  }

  const supabase = await createClient()

  // Pull active members of the same school. We intentionally do NOT
  // join schools here - the user's schoolName is already on the
  // current user object via requireUser, so a JOIN would be a wasted
  // round trip. Admins are excluded from the directory: they're
  // program staff, not teammates, and showing them on a fellow's
  // team page is confusing.
  const { data: rows } = await supabase
    .from('profiles')
    .select('id, full_name, email, title, avatar_url, role, cohort, bio')
    .eq('school_id', user.schoolTeamId)
    .in('role', ['fellow', 'facilitator'])
    .is('deactivated_at', null)
    .order('full_name', { ascending: true })

  const members: DirectoryProfile[] = (rows ?? []).map((r) => ({
    id: r.id,
    full_name: r.full_name,
    email: r.email,
    title: r.title,
    avatar_url: r.avatar_url,
    role: r.role,
    cohort: r.cohort,
    bio: r.bio,
    school_name: user.schoolName,
  }))

  const memberCount = members.length

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-10">
        <header className="flex flex-col gap-2 border-b border-border pb-6">
          <p className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            My Team
          </p>
          <h1 className="font-serif text-3xl text-foreground text-balance sm:text-4xl">
            {user.schoolName}
          </h1>
          <p className="text-sm text-muted-foreground">
            {memberCount === 1
              ? '1 member'
              : `${memberCount} members working together in the Fellowship.`}
          </p>
        </header>

        <section className="mt-8">
          {memberCount === 0 ? (
            <p className="rounded-md border border-dashed border-border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
              No teammates have been added yet. Check back once your school
              cohort is fully enrolled.
            </p>
          ) : (
            <TeamDirectory
              members={members}
              showCohort={user.role === 'admin'}
            />
          )}
        </section>
      </main>
    </div>
  )
}
