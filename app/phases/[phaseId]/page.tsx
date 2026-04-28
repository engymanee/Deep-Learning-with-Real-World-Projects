import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { ContentItemCard, type ContentItemView } from '@/components/content-item-card'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth-server'
import { fellowCanAccess } from '@/lib/cohorts'
import {
  CATEGORY_DISPLAY_ORDER,
  CONTENT_CATEGORY_LABELS,
  CONTENT_CATEGORY_DESCRIPTIONS,
  effectiveCohorts,
  type ContentCategory,
  type ContentResourceType,
} from '@/lib/content-types'

export const dynamic = 'force-dynamic'

interface PhaseRow {
  id: string
  title: string
  description: string | null
  cohorts: string[] | null
}

interface ContentItemRow {
  id: string
  year_id: string
  title: string
  description: string | null
  body: string | null
  url: string | null
  category: ContentCategory | null
  resource_type: ContentResourceType | null
  cohorts: string[] | null
  order_index: number
}

interface ProgressRow {
  lab_id: string
  status: string | null
}

/**
 * Fellow-facing phase view.
 *
 * Two-level cohort gating per the program rules:
 *
 *  1. The phase itself must be assigned to the fellow's cohort,
 *     otherwise they get a 404 (we never leak the existence of
 *     phases they aren't enrolled in).
 *
 *  2. Each content item resolves its effective cohort list via
 *     `effectiveCohorts()` - inherit from the phase, override, or
 *     locked - and is filtered out client-side if the fellow
 *     doesn't pass.
 *
 * Admins and facilitators bypass both checks so they can audit any
 * phase's content (including via "Preview as fellow", which arrives
 * here as a fellow-shaped CurrentUser).
 */
export default async function FellowPhasePage({
  params,
}: {
  params: Promise<{ phaseId: string }>
}) {
  const { phaseId } = await params

  const user = await requireUser()
  const supabase = await createClient()

  const { data: phase } = await supabase
    .from('years')
    .select('id, title, description, cohorts')
    .eq('id', phaseId)
    .maybeSingle<PhaseRow>()

  if (!phase) notFound()

  const isFellow = user.role === 'fellow'
  const userCohort = user.cohort ?? null

  // Top-level gating: phase has to be assigned to the fellow's cohort.
  if (isFellow && !fellowCanAccess(phase.cohorts, userCohort)) {
    notFound()
  }

  const { data: itemsRaw } = await supabase
    .from('labs')
    .select(
      'id, year_id, title, description, body, url, category, resource_type, cohorts, order_index',
    )
    .eq('year_id', phase.id)
    .order('order_index', { ascending: true })

  // Apply two-level cohort gating per item, drop legacy items that
  // pre-date the new schema (no category / resource_type), and group
  // by category in the canonical display order.
  const visibleByCategory = new Map<ContentCategory, ContentItemRow[]>()
  for (const cat of CATEGORY_DISPLAY_ORDER) visibleByCategory.set(cat, [])

  for (const row of (itemsRaw ?? []) as ContentItemRow[]) {
    if (!row.category || !row.resource_type) continue
    if (isFellow) {
      const effective = effectiveCohorts(row.cohorts, phase.cohorts)
      if (!fellowCanAccess(effective, userCohort)) continue
    }
    visibleByCategory.get(row.category)?.push(row)
  }

  // Per-item completion (fellows only).
  let completedSet = new Set<string>()
  if (isFellow) {
    const visibleIds = Array.from(visibleByCategory.values())
      .flat()
      .map((i) => i.id)
    if (visibleIds.length > 0) {
      const { data: progress } = await supabase
        .from('user_lab_progress')
        .select('lab_id, status')
        .eq('profile_id', user.id)
        .in('lab_id', visibleIds)
      completedSet = new Set(
        (progress ?? [])
          .filter((p: ProgressRow) => p.status === 'complete')
          .map((p: ProgressRow) => p.lab_id),
      )
    }
  }

  const allVisible = Array.from(visibleByCategory.values()).flat()
  const totalItems = allVisible.length
  const completedItems = allVisible.filter((i) => completedSet.has(i.id)).length
  const pct =
    totalItems === 0 ? 0 : Math.round((completedItems / totalItems) * 100)

  return (
    <AppShell showSidebar currentYearId={phase.id}>
      <div className="space-y-8">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-xs text-text-muted"
        >
          <Link href="/dashboard" className="hover:text-text">
            Home
          </Link>
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
          <span className="truncate font-medium text-text">{phase.title}</span>
        </nav>

        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Phase
          </p>
          <h1 className="text-pretty font-serif text-3xl leading-tight text-text md:text-4xl">
            {phase.title}
          </h1>
          {phase.description && (
            <p className="max-w-3xl text-pretty text-base leading-relaxed text-text-muted">
              {phase.description}
            </p>
          )}

          {totalItems > 0 && isFellow && (
            <div
              className="mt-2 flex items-center gap-3"
              role="group"
              aria-label="Phase progress"
            >
              <div className="h-1.5 w-full max-w-md overflow-hidden rounded-full bg-bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="whitespace-nowrap text-xs font-medium text-text-muted">
                {completedItems} of {totalItems} complete
              </span>
            </div>
          )}
        </header>

        <div className="space-y-10">
          {CATEGORY_DISPLAY_ORDER.map((cat) => {
            const items = visibleByCategory.get(cat) ?? []
            if (items.length === 0) return null
            return (
              <section
                key={cat}
                aria-labelledby={`cat-${cat}`}
                className="space-y-4"
              >
                <div>
                  <h2
                    id={`cat-${cat}`}
                    className="font-serif text-xl font-semibold text-text md:text-2xl"
                  >
                    {CONTENT_CATEGORY_LABELS[cat]}
                  </h2>
                  <p className="mt-1 max-w-3xl text-sm leading-relaxed text-text-muted">
                    {CONTENT_CATEGORY_DESCRIPTIONS[cat]}
                  </p>
                </div>

                <div className="space-y-3">
                  {items.map((item) => (
                    <ContentItemCard
                      key={item.id}
                      phaseId={phase.id}
                      initialCompleted={completedSet.has(item.id)}
                      showCompletion={isFellow}
                      item={
                        {
                          id: item.id,
                          title: item.title,
                          description: item.description,
                          body: item.body,
                          url: item.url,
                          // Non-null because we filtered legacy rows out above.
                          resource_type: item.resource_type as ContentResourceType,
                        } satisfies ContentItemView
                      }
                    />
                  ))}
                </div>
              </section>
            )
          })}

          {totalItems === 0 && (
            <div className="rounded-lg border border-dashed border-border p-8 text-center">
              <p className="text-sm text-text-muted">
                Your facilitator hasn&apos;t published content for this phase yet. Check back soon.
              </p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
