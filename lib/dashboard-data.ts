import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth-server'
import {
  CONTENT_CATEGORIES,
  canFellowSeeContent,
  canFellowSeePhase,
  type ContentCategory,
} from '@/lib/curriculum'
import type { CurrentUser } from '@/lib/user-context'

// ============================================================================
// Types
// ============================================================================

export interface DashboardPhase {
  id: string
  orderIndex: number
  title: string
  description: string | null
  contentCount: number
  /** Per-category counts of content visible to this user. */
  categoryCounts: Record<ContentCategory, number>
}

export interface DashboardSessionFacilitator {
  id: string
  name: string
  initials: string
}

export interface DashboardSession {
  id: string
  title: string
  startTime: string
  endTime: string
  joinUrl: string | null
  facilitators: DashboardSessionFacilitator[]
}

export interface DashboardAnnouncement {
  id: string
  title: string
  body: string
  pinned: boolean
  publishedAt: string
  author: { name: string; initials: string } | null
}

export interface DashboardData {
  user: CurrentUser
  phases: DashboardPhase[]
  upcomingSession: DashboardSession | null
  announcements: DashboardAnnouncement[]
}

// ============================================================================
// Helpers
// ============================================================================

function initialsFor(name: string | null | undefined): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
}

function emptyCategoryCounts(): Record<ContentCategory, number> {
  const out = {} as Record<ContentCategory, number>
  for (const c of CONTENT_CATEGORIES) out[c.value] = 0
  return out
}

// ============================================================================
// Loader
// ============================================================================

export async function getDashboardData(): Promise<DashboardData> {
  const user = await requireUser()
  const supabase = await createClient()

  // ---------------------------------------------------------------------------
  // Phases + content (filtered for fellows by cohort access)
  // ---------------------------------------------------------------------------
  const isFellow = user.role === 'fellow'
  const userCohort = user.cohort ?? null

  const [{ data: phaseRows }, { data: itemRows }] = await Promise.all([
    supabase
      .from('years')
      .select('id, order_index, title, description, cohorts')
      .order('order_index', { ascending: true }),
    supabase
      .from('labs')
      .select('id, year_id, category, cohorts')
      .returns<
        Array<{
          id: string
          year_id: string
          category: ContentCategory | null
          cohorts: string[] | null
        }>
      >(),
  ])

  const phaseCohortById = new Map<string, string[] | null>()
  for (const p of phaseRows ?? []) {
    phaseCohortById.set(p.id, (p.cohorts as string[] | null) ?? null)
  }

  // Group items by phase, applying per-fellow cohort visibility.
  const itemsByPhase = new Map<string, Map<ContentCategory, number>>()
  for (const item of itemRows ?? []) {
    if (!item.category) continue
    if (isFellow) {
      const phaseCohorts = phaseCohortById.get(item.year_id) ?? null
      if (!canFellowSeeContent(item.cohorts, phaseCohorts, userCohort)) continue
    }
    let inner = itemsByPhase.get(item.year_id)
    if (!inner) {
      inner = new Map<ContentCategory, number>()
      itemsByPhase.set(item.year_id, inner)
    }
    inner.set(item.category, (inner.get(item.category) ?? 0) + 1)
  }

  // Build the phase list, hiding phases the fellow can't see at all.
  const phases: DashboardPhase[] = []
  for (const p of phaseRows ?? []) {
    if (isFellow && !canFellowSeePhase(p.cohorts as string[] | null, userCohort)) {
      continue
    }
    const counts = itemsByPhase.get(p.id) ?? new Map<ContentCategory, number>()
    const categoryCounts = emptyCategoryCounts()
    let total = 0
    for (const [cat, n] of counts) {
      categoryCounts[cat] = n
      total += n
    }
    phases.push({
      id: p.id,
      orderIndex: p.order_index,
      title: p.title,
      description: p.description,
      contentCount: total,
      categoryCounts,
    })
  }

  // ---------------------------------------------------------------------------
  // Upcoming session (within 7 days, user's cohort)
  // ---------------------------------------------------------------------------
  const { data: cohortMemberships } = await supabase
    .from('cohort_members')
    .select('cohort_id')
    .eq('profile_id', user.id)

  const cohortIds = (cohortMemberships ?? []).map((r) => r.cohort_id)
  let upcomingSession: DashboardSession | null = null
  if (cohortIds.length > 0) {
    const nowIso = new Date().toISOString()
    const sevenDaysIso = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString()
    const { data: sessionRow } = await supabase
      .from('sessions')
      .select(
        'id, title, starts_at, ends_at, zoom_link, session_facilitators(profile_id, profiles:profiles(id, full_name))',
      )
      .in('cohort_id', cohortIds)
      .gte('starts_at', nowIso)
      .lte('starts_at', sevenDaysIso)
      .order('starts_at', { ascending: true })
      .limit(1)
      .maybeSingle<{
        id: string
        title: string
        starts_at: string
        ends_at: string | null
        zoom_link: string | null
        session_facilitators: Array<{
          profile_id: string
          profiles: { id: string; full_name: string | null } | null
        }>
      }>()
    if (sessionRow) {
      upcomingSession = {
        id: sessionRow.id,
        title: sessionRow.title,
        startTime: sessionRow.starts_at,
        endTime:
          sessionRow.ends_at ??
          new Date(
            new Date(sessionRow.starts_at).getTime() + 60 * 60 * 1000,
          ).toISOString(),
        joinUrl: sessionRow.zoom_link,
        facilitators: (sessionRow.session_facilitators ?? [])
          .map((sf) => sf.profiles)
          .filter((p): p is { id: string; full_name: string | null } => !!p)
          .map((p) => ({
            id: p.id,
            name: p.full_name ?? 'Facilitator',
            initials: initialsFor(p.full_name),
          })),
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Announcements (RLS already scopes audience)
  // ---------------------------------------------------------------------------
  const { data: announcementRows } = await supabase
    .from('announcements')
    .select(
      'id, title, body, pinned, published_at, author:profiles!author_id(full_name)',
    )
    .order('pinned', { ascending: false })
    .order('published_at', { ascending: false })
    .limit(5)

  const announcements: DashboardAnnouncement[] = (announcementRows ?? []).map(
    (row) => {
      const authorRecord = Array.isArray(row.author) ? row.author[0] : row.author
      return {
        id: row.id,
        title: row.title,
        body: row.body,
        pinned: row.pinned,
        publishedAt: row.published_at,
        author: authorRecord
          ? {
              name: authorRecord.full_name ?? 'Team',
              initials: initialsFor(authorRecord.full_name),
            }
          : null,
      }
    },
  )

  return { user, phases, upcomingSession, announcements }
}
