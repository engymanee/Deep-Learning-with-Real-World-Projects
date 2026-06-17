import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { requireUser } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase/server'
import { COMMUNITY_SECTIONS } from '@/lib/community/sections'
import { Badge } from '@/components/ui/badge'

export const metadata = {
  title: 'Community | Leadership Fellowship',
  description:
    'Connect with the Fellowship - explore bios, share wins, reflections, and questions with peers.',
}

interface SectionCountQuery {
  count: number | null
}

export default async function CommunityOverviewPage() {
  await requireUser()
  const supabase = await createClient()

  // Get counts for all sections
  const countPromises = COMMUNITY_SECTIONS.map((s) => {
    if (s.slug === 'bios') {
      return supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .in('role', ['fellow', 'facilitator'])
        .is('deactivated_at', null)
    }
    if (s.slug === 'schools') {
      return supabase
        .from('cohorts')
        .select('id', { count: 'exact', head: true })
    }
    if (s.slug === 'reflections') {
      return supabase
        .from('user_content_reflections')
        .select('id', { count: 'exact', head: true })
        .neq('visibility', 'private')
    }
    return supabase
      .from('community_posts')
      .select('id', { count: 'exact', head: true })
      .in('kind', s.postKinds ?? [])
      .not('published_at', 'is', null)
  })

  const countResults = await Promise.all(countPromises)

  const counts = COMMUNITY_SECTIONS.map((s, i) => ({
    section: s,
    count: countResults[i].count ?? 0,
  }))

  // Highlight featured sections (Reflections)
  const featuredSections = counts.filter((c) => 
    c.section.slug === 'reflections'
  )
  
  const otherSections = counts.filter((c) => 
    c.section.slug !== 'reflections'
  )

  return (
    <>
      <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Community of Practice
          </p>
          <h1 className="font-serif text-3xl text-foreground sm:text-4xl">
            Welcome to the Fellowship
          </h1>
          <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
            Connect with your peers, celebrate progress, and learn from shared experiences across the program.
          </p>
        </div>
        {/* Quick path to the curated weekly read-out. */}
        <Link
          href="/community/dashboard"
          className="inline-flex items-center gap-1 self-start rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary sm:self-auto"
        >
          This week&apos;s dashboard
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      </header>

      {/* Featured Sections */}
      {featuredSections.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-serif text-xl text-foreground">
              Featured sections
            </h2>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {featuredSections.map(({ section, count }) => {
            const Icon = section.icon
            return (
              <li key={section.id}>
                <Link
                  href={`/community/${section.slug}`}
                  className="group flex h-full flex-col gap-3 rounded-lg border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <span className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <Badge variant="outline" className="text-xs tabular-nums">
                      {count}
                    </Badge>
                  </div>
                  <div>
                    <h3 className="font-serif text-lg text-foreground group-hover:text-primary">
                      {section.label}
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {section.description}
                    </p>
                  </div>
                  <span className="mt-auto inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                    Explore
                    <ArrowRight className="h-3 w-3" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            )
            })}
          </ul>
        </section>
      )}

      {/* All Sections Grid */}
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-serif text-xl text-foreground">
            Browse all sections
          </h2>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {otherSections.map(({ section, count }) => {
            const Icon = section.icon
            return (
              <li key={section.id}>
                <Link
                  href={`/community/${section.slug}`}
                  className="group flex h-full flex-col gap-2 rounded-lg border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <Badge variant="outline" className="text-xs tabular-nums">
                      {count}
                    </Badge>
                  </div>
                  <h3 className="font-serif text-base text-foreground group-hover:text-primary">
                    {section.label}
                  </h3>
                  <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {section.description}
                  </p>
                  <span className="mt-auto inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                    Open
                    <ArrowRight className="h-3 w-3" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
    </>
  )
}
