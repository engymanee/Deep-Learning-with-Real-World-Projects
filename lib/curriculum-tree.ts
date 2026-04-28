import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth-server'
import {
  canFellowSeeContent,
  canFellowSeeModule,
  canFellowSeePhase,
} from '@/lib/curriculum'

/**
 * Server-side data layer for the fellow curriculum view.
 *
 * Returns the entire phase -> modules -> contents tree the current
 * user is allowed to see, plus their completion set. Visibility uses
 * the same Phase -> Module -> Content cascade as everywhere else, and
 * is bypassed for admins/facilitators (they see everything).
 *
 * Use from layouts/pages under `/phases/[phaseId]/...`.
 */

export interface CurriculumItem {
  id: string
  title: string
  /** Optional duration in minutes; rendered as "55min" in the tree. */
  durationMinutes: number | null
  /** href for the right-pane router push when this item is opened. */
  href: string
  /** Whether the current user has marked this item complete. */
  isCompleted: boolean
}

export interface CurriculumModule {
  id: string
  title: string
  description: string | null
  /** href for the module landing page (no specific item selected). */
  href: string
  items: CurriculumItem[]
}

export interface CurriculumTree {
  phase: {
    id: string
    title: string
    description: string | null
    /** href for the phase landing page. */
    href: string
  }
  modules: CurriculumModule[]
  /** True when the user is an admin/facilitator (visibility filtering bypassed). */
  isPrivileged: boolean
}

/**
 * Load the full visible tree for a phase. Triggers `notFound()` if
 * the phase doesn't exist or the user can't see it. Never returns a
 * stub - if you get back a tree it's valid for the user.
 */
export async function loadCurriculumTree(
  phaseId: string,
): Promise<CurriculumTree> {
  const user = await requireUser()
  const supabase = await createClient()
  const isFellow = user.role === 'fellow'
  const userCohort = user.cohort ?? null

  const [
    { data: phase },
    { data: modules },
    { data: items },
    { data: completions },
  ] = await Promise.all([
    supabase
      .from('years')
      .select('id, title, description, cohorts')
      .eq('id', phaseId)
      .maybeSingle<{
        id: string
        title: string
        description: string | null
        cohorts: string[] | null
      }>(),
    supabase
      .from('modules')
      .select('id, phase_id, title, description, cohorts, order_index')
      .eq('phase_id', phaseId)
      .order('order_index', { ascending: true })
      .returns<
        Array<{
          id: string
          phase_id: string
          title: string
          description: string | null
          cohorts: string[] | null
          order_index: number
        }>
      >(),
    supabase
      .from('labs')
      .select(
        'id, module_id, title, category, cohorts, duration_minutes, order_index',
      )
      .eq('year_id', phaseId)
      .order('order_index', { ascending: true })
      .returns<
        Array<{
          id: string
          module_id: string | null
          title: string
          category: string | null
          cohorts: string[] | null
          duration_minutes: number | null
          order_index: number
        }>
      >(),
    // RLS limits this to the current user's rows. We still scope by id
    // so we don't pull every completion the user has across phases.
    supabase
      .from('user_content_completions')
      .select('content_id')
      .returns<Array<{ content_id: string }>>(),
  ])

  if (!phase) notFound()
  if (isFellow && !canFellowSeePhase(phase.cohorts, userCohort)) notFound()

  const completedSet = new Set(
    (completions ?? []).map((c) => c.content_id),
  )

  // Filter modules by phase-cascade visibility.
  const visibleModules = (modules ?? []).filter((m) =>
    !isFellow ? true : canFellowSeeModule(m.cohorts, phase.cohorts, userCohort),
  )
  const moduleCohortById = new Map<string, string[] | null>()
  for (const m of visibleModules) moduleCohortById.set(m.id, m.cohorts)

  // Group visible items under their module.
  const itemsByModule = new Map<string, CurriculumItem[]>()
  for (const m of visibleModules) itemsByModule.set(m.id, [])

  for (const item of items ?? []) {
    if (!item.module_id) continue
    if (!item.category) continue // legacy/draft rows without a category
    const moduleCohorts = moduleCohortById.get(item.module_id)
    if (moduleCohorts === undefined) continue // module not visible to user
    if (isFellow) {
      if (
        !canFellowSeeContent(
          item.cohorts,
          phase.cohorts,
          userCohort,
          moduleCohorts,
        )
      ) {
        continue
      }
    }
    itemsByModule.get(item.module_id)!.push({
      id: item.id,
      title: item.title,
      durationMinutes: item.duration_minutes,
      href: `/phases/${phase.id}/modules/${item.module_id}/items/${item.id}`,
      isCompleted: completedSet.has(item.id),
    })
  }

  return {
    phase: {
      id: phase.id,
      title: phase.title,
      description: phase.description,
      href: `/phases/${phase.id}`,
    },
    modules: visibleModules.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      href: `/phases/${phase.id}/modules/${m.id}`,
      items: itemsByModule.get(m.id) ?? [],
    })),
    isPrivileged: !isFellow,
  }
}
