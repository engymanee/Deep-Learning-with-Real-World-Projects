import { requireUser } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase/server'
import { BiosDirectory } from '@/components/community/bios-directory'
import { SectionHeader } from '@/components/community/section-header'
import { getSectionBySlug } from '@/lib/community/sections'
import type { DirectoryProfile } from '@/lib/types/profile'

export const metadata = {
  title: 'Fellow Bios | Community | Leadership Fellowship',
}

interface RawProfile {
  id: string
  full_name: string | null
  email: string | null
  title: string | null
  avatar_url: string | null
  role: string | null
  cohort: string | null
  bio: string | null
  schools: { name: string | null } | null
}

/**
 * /community/bios - the searchable directory of fellows + facilitators.
 *
 * Reuses `BiosDirectory`, which renders MemberCards with the
 * uploaded headshot (falling back to initials). Cohort labels are
 * gated behind admin role to keep program-internal staging metadata
 * out of fellow-facing surfaces.
 */
export default async function CommunityBiosPage() {
  const user = await requireUser()
  const section = getSectionBySlug('bios')!
  const supabase = await createClient()

  const { data } = await supabase
    .from('profiles')
    .select(
      `
      id, full_name, email, title, avatar_url, role, cohort, bio,
      schools:school_id (name)
      `,
    )
    .in('role', ['fellow', 'facilitator'])
    .is('deactivated_at', null)
    .order('full_name', { ascending: true })
    .limit(500)
    .returns<RawProfile[]>()

  const profiles: DirectoryProfile[] = (data ?? []).map((p) => ({
    id: p.id,
    full_name: p.full_name,
    email: p.email,
    title: p.title,
    avatar_url: p.avatar_url,
    role: p.role,
    cohort: p.cohort,
    bio: p.bio,
    school_name: p.schools?.name ?? null,
  }))

  return (
    <div className="flex flex-col">
      <SectionHeader
        section={section}
        count={profiles.length}
        canPost={false}
      />

      {profiles.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
          No fellows or facilitators are listed yet.
        </p>
      ) : (
        <BiosDirectory
          profiles={profiles}
          showCohort={user.role === 'admin'}
        />
      )}
    </div>
  )
}
