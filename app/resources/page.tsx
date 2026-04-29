import { requireUser } from '@/lib/auth-server'
import { cohortReleasedFor } from '@/lib/cohorts'
import { createClient } from '@/lib/supabase/server'
import { TopBar } from '@/components/top-bar'
import {
  LibraryView,
  type LibraryResource,
} from '@/components/library/library-view'

export const metadata = {
  title: 'Library | Leadership Fellowship',
  description:
    'Curated documents, videos, and readings for the Leadership Fellowship.',
}

/** Allowed values mirror the CHECK constraint on community_resources. */
const VALID_TYPES = new Set(['document', 'video', 'link', 'reading'])

/**
 * Library route. Server component: pulls every published resource,
 * splits Further Reading (universal) from My Resources (cohort-gated),
 * applies cumulative cohort access for fellows, then hands the lists
 * to the client `<LibraryView>` for tabs / search / filters.
 *
 * Cohort rules (see lib/cohorts.ts):
 *  - Universal rows: visible to every authenticated user.
 *  - Cohort-gated rows for fellows: cumulative - a fellow in B sees A + B,
 *    a fellow in C sees A + B + C (`cohortReleasedFor`).
 *  - Facilitators / admins: see every resource so they can curate.
 */
export default async function LibraryPage() {
  // requireUser redirects to /auth/login when there's no session;
  // every code path below can assume a real CurrentUser.
  const user = await requireUser()
  const supabase = await createClient()

  const { data: rows } = await supabase
    .from('community_resources')
    .select(
      'id, title, description, url, resource_type, tags, cohorts, is_universal, created_at, cover_url',
    )
    .order('created_at', { ascending: false })

  const all = rows ?? []
  const isFellow = user.role === 'fellow'

  // Two parallel slices, each gated independently. Universal rows
  // are visible to everyone authenticated, so the only check is the
  // is_universal flag. Cohort-gated rows go through the cumulative
  // helper for fellows; staff bypass.
  const universalRows = all.filter((r) => r.is_universal === true)
  const cohortGatedRows = all
    .filter((r) => r.is_universal !== true)
    .filter((r) => {
      if (!isFellow) return true
      return cohortReleasedFor(
        r.cohorts as string[] | null,
        user.cohort ?? null,
      )
    })

  // Map raw rows -> view shape. Old rows that pre-date 033 may have
  // an unexpected resource_type from a hand edit; we coerce anything
  // unknown to 'reading' so the icon picker is always defined.
  function toResource(r: (typeof all)[number]): LibraryResource {
    return {
      id: r.id,
      title: r.title,
      description: r.description,
      url: r.url,
      resourceType: VALID_TYPES.has(r.resource_type)
        ? (r.resource_type as LibraryResource['resourceType'])
        : 'reading',
      tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
      cohorts: Array.isArray(r.cohorts) ? (r.cohorts as string[]) : [],
      isUniversal: r.is_universal === true,
      createdAt: r.created_at,
      coverUrl: r.cover_url ?? null,
    }
  }

  const myResources: LibraryResource[] = cohortGatedRows.map(toResource)
  const furtherReading: LibraryResource[] = universalRows.map(toResource)

  const canManage = user.role === 'admin' || user.role === 'facilitator'
  // Cohort labels are program-internal staging metadata. Surface
  // them on cards / list rows for admins only - facilitators and
  // fellows shouldn't see them.
  const showCohort = user.role === 'admin'

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-10">
        <LibraryView
          myResources={myResources}
          furtherReading={furtherReading}
          canManage={canManage}
          showCohort={showCohort}
        />
      </main>
    </div>
  )
}
