import { requireUser } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase/server'
import { SectionHeader } from '@/components/community/section-header'
import { getSectionBySlug } from '@/lib/community/sections'

export const metadata = {
  title: 'School Profile | Community | Leadership Fellowship',
}

interface School {
  id: string
  name: string | null
  description: string | null
  location: string | null
  website_url: string | null
  contact_email: string | null
  logo_url: string | null
  leadership_team_size: number
}

export default async function CommunitySchoolsPage() {
  await requireUser()
  const section = getSectionBySlug('schools')!
  const supabase = await createClient()

  // Fetch all schools (cohorts) with member count
  const { data: cohorts } = await supabase
    .from('cohorts')
    .select(
      `
      id,
      name,
      description,
      location,
      website_url,
      contact_email,
      logo_url
      `,
    )
    .order('name', { ascending: true })
    .returns<Omit<School, 'leadership_team_size'>[]>()

  // Count leadership team members for each cohort
  const schools: School[] = []
  if (cohorts && cohorts.length > 0) {
    for (const cohort of cohorts) {
      const { count } = await supabase
        .from('cohort_members')
        .select('id', { count: 'exact', head: true })
        .eq('cohort_id', cohort.id)

      schools.push({
        ...cohort,
        leadership_team_size: count ?? 0,
      })
    }
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <SectionHeader
          section={section}
          count={schools.length}
          canPost={false}
        />

        {schools.length === 0 ? (
          <p className="rounded-md border border-dashed border-border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
            No schools are listed yet.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {schools.map((school) => (
              <div
                key={school.id}
                className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4"
              >
                {school.logo_url && (
                  <img
                    src={school.logo_url}
                    alt={school.name || 'School logo'}
                    className="h-16 w-16 rounded-md object-cover"
                  />
                )}
                <div className="flex flex-col gap-2">
                  <h3 className="font-serif text-lg font-semibold text-foreground">
                    {school.name}
                  </h3>
                  {school.location && (
                    <p className="text-xs text-muted-foreground">
                      📍 {school.location}
                    </p>
                  )}
                  {school.description && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {school.description}
                    </p>
                  )}
                </div>
                <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
                  <span className="text-xs text-muted-foreground">
                    {school.leadership_team_size}{' '}
                    {school.leadership_team_size === 1
                      ? 'team member'
                      : 'team members'}
                  </span>
                  {school.website_url && (
                    <a
                      href={school.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Visit
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
