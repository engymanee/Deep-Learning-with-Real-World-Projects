import { requireUser } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase/server'
import { SectionHeader } from '@/components/community/section-header'
import { getSectionBySlug } from '@/lib/community/sections'
import { SchoolCardClient } from '@/components/community/school-card-client'

export const metadata = {
  title: 'School Profile | Community | Leadership Fellowship',
}

interface School {
  id: string
  name: string | null
}

interface TeamMember {
  id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
  title: string | null
  role: string
}

export default async function CommunitySchoolsPage() {
  await requireUser()
  const section = getSectionBySlug('schools')!
  const supabase = await createClient()

  // Fetch all schools
  const { data: schools } = await supabase
    .from('schools')
    .select('id, name')
    .order('name', { ascending: true })
    .returns<School[]>()

  // For each school, fetch its staff/facilitators
  const schoolsWithTeams = await Promise.all(
    (schools ?? []).map(async (school) => {
      const { data: members } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, title, role')
        .eq('school_id', school.id)
        .in('role', ['facilitator', 'admin'])
        .order('full_name', { ascending: true })
        .returns<TeamMember[]>()

      return {
        ...school,
        members: members ?? [],
      }
    }),
  )

  return (
    <>
      <div className="flex flex-col gap-6">
        <SectionHeader
          section={section}
          count={schoolsWithTeams.length}
          canPost={false}
        />

        {schoolsWithTeams.length === 0 ? (
          <p className="rounded-md border border-dashed border-border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
            No schools are listed yet.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {schoolsWithTeams.map((school) => (
              <SchoolCardClient
                key={school.id}
                id={school.id}
                name={school.name}
                logo_url={null}
                members={school.members}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
