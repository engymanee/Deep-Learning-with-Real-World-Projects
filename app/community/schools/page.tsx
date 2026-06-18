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
  description?: string | null
  location?: string | null
  contact_email?: string | null
  website_url?: string | null
  logo_url?: string | null
}

export default async function CommunitySchoolsPage() {
  await requireUser()
  const section = getSectionBySlug('schools')!
  const supabase = await createClient()

  // Fetch all schools with their information
  const { data: schools } = await supabase
    .from('schools')
    .select('id, name, description, location, contact_email, website_url, logo_url')
    .order('name', { ascending: true })
    .returns<School[]>()

  return (
    <>
      <div className="flex flex-col gap-6">
        <SectionHeader
          section={section}
          canPost={false}
        />

        {!schools || schools.length === 0 ? (
          <p className="rounded-md border border-dashed border-border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
            No schools are listed yet.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {schools.map((school) => (
              <SchoolCardClient
                key={school.id}
                id={school.id}
                name={school.name}
                logo_url={school.logo_url}
                description={school.description}
                location={school.location}
                contact_email={school.contact_email}
                website_url={school.website_url}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
