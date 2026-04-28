import { requireUser } from '@/lib/auth-server'
import { fellowCanAccess } from '@/lib/cohorts'
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
 * applies cohort gating for fellows, then hands the list off to the
 * client `<LibraryView>` for search / filter / view-toggle.
 *
 * Cohort rules:
 *  - Fellows: only resources where cohorts contains the fellow's own
 *    cohort label (per `fellowCanAccess`).
 *  - Facilitators / admins: see every resource so they can curate.
 */
export default async function LibraryPage() {
  // requireUser redirects to /auth/login when there's no session;
  // every code path below can assume a real CurrentUser.
  const user = await requireUser()
  const supabase = await createClient()

  // Pull just the columns the view consumes. Sorting newest-first
  // upfront means the "Recent" filter and the default order match
  // out of the box, even before the client memo re-sorts.
  const { data: rows } = await supabase
    .from('community_resources')
    .select('id, title, description, url, resource_type, tags, cohorts, created_at')
    .order('created_at', { ascending: false })

  const all = rows ?? []
  const visible =
    user.role === 'fellow'
      ? all.filter((r) =>
          fellowCanAccess(r.cohorts as string[] | null, user.cohort ?? null),
        )
      : all

  // Map raw rows -> view shape. Old rows that pre-date 033 may have
  // an unexpected resource_type from a hand edit; we coerce anything
  // unknown to 'reading' so the icon picker is always defined.
  const resources: LibraryResource[] = visible.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    url: r.url,
    resourceType: VALID_TYPES.has(r.resource_type)
      ? (r.resource_type as LibraryResource['resourceType'])
      : 'reading',
    tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
    createdAt: r.created_at,
  }))

  const canManage = user.role === 'admin' || user.role === 'facilitator'

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-10">
        <LibraryView resources={resources} canManage={canManage} />
      </main>
    </div>
  )
}
