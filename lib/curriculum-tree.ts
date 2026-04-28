import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth-server'
import {
  canFellowSeeContent,
  canFellowSeeModule,
  canFellowSeePhase,
  isContentCategory,
  type ContentCategory,
} from '@/lib/curriculum'

/**
 * Server-side data layer for the fellow curriculum view.
 *
 * Returns every Phase -> Module -> Content the current user is
 * allowed to see, plus their completion set, as a flat tree the
 * dashboard renders inline (no per-phase landing page).
 *
 * Visibility uses the same Phase -> Module -> Content cascade as
 * everywhere else, and is bypassed for admins/facilitators (they see
 * everything).
 */

export interface CurriculumItem {
  id: string
  title: string
  /**
   * Category drives in-module grouping (Before / During / After Lab,
   * etc.) - the tree splits items into category buckets per module.
   */
  category: ContentCategory
  /** Optional duration in minutes; rendered as "55min" in the tree. */
  durationMinutes: number | null
  /** href for the content viewer page. */
  href: string
  /** Whether the current user has marked this item complete. */
  isCompleted: boolean
}

export interface CurriculumModule {
  id: string
  title: string
  description: string | null
  items: CurriculumItem[]
}

export interface CurriculumPhase {
  id: string
  title: string
  description: string | null
  modules: CurriculumModule[]
  /** Total visible content items across all modules. */
  itemCount: number
  /** Total items the user has marked complete. */
  completedCount: number
}

export interface FullCurriculum {
  phases: CurriculumPhase[]
  /** True when the user is an admin/facilitator (visibility bypassed). */
  isPrivileged: boolean
}

/**
 * Load every visible phase + nested modules + items for the current
 * user, in display order. Single helper used by the dashboard's
 * collapsible curriculum tree.
 */
export async function loadFullCurriculum(): Promise<FullCurriculum> {
  const user = await requireUser()
  const supabase = await createClient()
  const isFellow = user.role === 'fellow'
  const userCohort = user.cohort ?? null

  const [
    { data: phaseRows },
    { data: moduleRows },
    { data: itemRows },
    { data: completionRows },
  ] = await Promise.all([
    supabase
      .from('years')
      .select('id, title, description, cohorts, order_index')
      .order('order_index', { ascending: true })
      .returns<
        Array<{
          id: string
          title: string
          description: string | null
          cohorts: string[] | null
          order_index: number
        }>
      >(),
    supabase
      .from('modules')
      .select('id, phase_id, title, description, cohorts, order_index')
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
        'id, year_id, module_id, title, category, cohorts, duration_minutes, order_index',
      )
      .order('order_index', { ascending: true })
      .returns<
        Array<{
          id: string
          year_id: string
          module_id: string | null
          title: string
          category: string | null
          cohorts: string[] | null
          duration_minutes: number | null
          order_index: number
        }>
      >(),
    // RLS already restricts this to the current user's rows.
    supabase
      .from('user_content_completions')
      .select('content_id')
      .returns<Array<{ content_id: string }>>(),
  ])

  const completedSet = new Set((completionRows ?? []).map((c) => c.content_id))

  // Phase visibility filter.
  const visiblePhases = (phaseRows ?? []).filter((p) =>
    !isFellow ? true : canFellowSeePhase(p.cohorts, userCohort),
  )
  const phaseCohortById = new Map<string, string[] | null>()
  for (const p of visiblePhases) phaseCohortById.set(p.id, p.cohorts)

  // Module visibility filter, grouped under their phase.
  const modulesByPhase = new Map<string, typeof moduleRows>()
  const moduleCohortById = new Map<string, string[] | null>()
  for (const m of moduleRows ?? []) {
    const phaseCohorts = phaseCohortById.get(m.phase_id)
    if (phaseCohorts === undefined) continue // phase not visible
    if (
      isFellow &&
      !canFellowSeeModule(m.cohorts, phaseCohorts, userCohort)
    ) {
      continue
    }
    moduleCohortById.set(m.id, m.cohorts)
    const list = modulesByPhase.get(m.phase_id) ?? []
    list.push(m)
    modulesByPhase.set(m.phase_id, list)
  }

  // Item visibility filter, grouped under their module.
  const itemsByModule = new Map<string, CurriculumItem[]>()
  for (const item of itemRows ?? []) {
    if (!item.module_id) continue
    if (!isContentCategory(item.category)) continue // legacy/draft rows
    const moduleCohorts = moduleCohortById.get(item.module_id)
    if (moduleCohorts === undefined) continue // module not visible
    const phaseCohorts = phaseCohortById.get(item.year_id) ?? null
    if (isFellow) {
      if (
        !canFellowSeeContent(
          item.cohorts,
          phaseCohorts,
          userCohort,
          moduleCohorts,
        )
      ) {
        continue
      }
    }
    const list = itemsByModule.get(item.module_id) ?? []
    list.push({
      id: item.id,
      title: item.title,
      category: item.category,
      durationMinutes: item.duration_minutes,
      href: `/phases/${item.year_id}/modules/${item.module_id}/items/${item.id}`,
      isCompleted: completedSet.has(item.id),
    })
    itemsByModule.set(item.module_id, list)
  }

  // Stitch everything together in display order.
  const phases: CurriculumPhase[] = visiblePhases.map((p) => {
    const modules = (modulesByPhase.get(p.id) ?? []).map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      items: itemsByModule.get(m.id) ?? [],
    }))
    let itemCount = 0
    let completedCount = 0
    for (const m of modules) {
      itemCount += m.items.length
      for (const i of m.items) if (i.isCompleted) completedCount += 1
    }
    return {
      id: p.id,
      title: p.title,
      description: p.description,
      modules,
      itemCount,
      completedCount,
    }
  })

  return { phases, isPrivileged: !isFellow }
}
