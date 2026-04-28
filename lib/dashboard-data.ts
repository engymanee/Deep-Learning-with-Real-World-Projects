import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth-server'
import { fellowCanAccess } from '@/lib/cohorts'
import type { CurrentUser } from '@/lib/user-context'

// ============================================================================
// Types exposed to dashboard components
// ============================================================================

export interface DashboardYear {
  id: string
  orderIndex: number
  title: string
  progress: number // 0-100
  labsCompleted: number
  labsTotal: number
  isLocked: boolean
}

export interface DashboardPosition {
  /** Year number: 1..3, or 4 if program complete. */
  year: number
  /** 1-based lab index within current year. */
  currentLab: number
  totalLabs: number
}

export interface DashboardResume {
  /** Phase the fellow should land in to keep going. */
  phaseId: string
  phaseTitle: string
  /** Title of the next incomplete content item inside that phase. */
  nextItemTitle: string
  /** 0-100, derived from items completed in the phase. */
  progress: number
}

export interface DashboardSessionFacilitator {
  id: string
  name: string
  initials: string
}

export interface DashboardSession {
  id: string
  title: string
  startTime: string // ISO
  endTime: string // ISO
  joinUrl: string | null
  facilitators: DashboardSessionFacilitator[]
}

export interface DashboardTeammate {
  id: string
  name: string
  initials: string
  progress: number // 0-100
}

export interface DashboardTeam {
  cohortId: string
  cohortName: string
  members: DashboardTeammate[]
}

export interface DashboardAnnouncement {
  id: string
  title: string
  body: string
  pinned: boolean
  publishedAt: string // ISO
  author: { name: string; initials: string } | null
}

export interface DashboardData {
  user: CurrentUser
  position: DashboardPosition
  isNewLearner: boolean
  /** Populated when there's an in-progress / resumable phase. */
  resume: DashboardResume | null
  /** First unlocked phase, for the brand-new-learner "Get Started" CTA. */
  startPhaseId: string | null
  years: DashboardYear[]
  upcomingSession: DashboardSession | null
  team: DashboardTeam | null
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

// ============================================================================
// Main loader
// ============================================================================

export async function getDashboardData(): Promise<DashboardData> {
  const user = await requireUser()
  const supabase = await createClient()

  // ---------------------------------------------------------------------------
  // 1. Years + labs (global reference data)
  // ---------------------------------------------------------------------------
  const [{ data: yearRows }, { data: labRows }] = await Promise.all([
    supabase
      .from('years')
      .select('id, order_index, title, cohorts')
      .order('order_index'),
    supabase
      .from('labs')
      .select('id, year_id, order_index, title, cohorts')
      .order('order_index'),
  ])

  // Fellows only see phases / items whose cohort gating allows them.
  // Admins and facilitators see everything regardless. We keep the data
  // shape downstream identical, just trimmed before progress is computed
  // so locked / hidden phases never confuse the position logic.
  const isFellow = user.role === 'fellow'
  const userCohort = user.cohort ?? null
  const allYears = (yearRows ?? []).filter((y) =>
    !isFellow ? true : fellowCanAccess(y.cohorts as string[] | null, userCohort),
  )
  const visibleYearIds = new Set(allYears.map((y) => y.id))
  const allLabs = (labRows ?? []).filter((l) => {
    if (!visibleYearIds.has(l.year_id)) return false
    if (!isFellow) return true
    return fellowCanAccess(l.cohorts as string[] | null, userCohort)
  })
  const labsByYear = new Map<string, typeof allLabs>()
  for (const lab of allLabs) {
    const list = labsByYear.get(lab.year_id) ?? []
    list.push(lab)
    labsByYear.set(lab.year_id, list)
  }

  // ---------------------------------------------------------------------------
  // 2. User's year + lab progress
  // ---------------------------------------------------------------------------
  const [{ data: yearProgressRows }, { data: labProgressRows }] =
    await Promise.all([
      supabase
        .from('user_year_progress')
        .select('year_id, status, progress')
        .eq('profile_id', user.id),
      supabase
        .from('user_lab_progress')
        .select('lab_id, status, progress, updated_at')
        .eq('profile_id', user.id),
    ])

  const yearProgressByYear = new Map(
    (yearProgressRows ?? []).map((row) => [row.year_id, row]),
  )
  const labProgressByLab = new Map(
    (labProgressRows ?? []).map((row) => [row.lab_id, row]),
  )

  // ---------------------------------------------------------------------------
  // 3. Assemble DashboardYear[] with lock logic
  //    Year N unlocks once Year N-1 is completed (progress >= 100).
  // ---------------------------------------------------------------------------
  const years: DashboardYear[] = []
  let priorYearComplete = true // Year 1 is always unlocked
  for (const yr of allYears) {
    const labsInYear = labsByYear.get(yr.id) ?? []
    const labsTotal = labsInYear.length
    const labsCompleted = labsInYear.filter((lab) => {
      const lp = labProgressByLab.get(lab.id)
      return lp?.status === 'complete' || (lp?.progress ?? 0) >= 100
    }).length
    const yp = yearProgressByYear.get(yr.id)
    const progress = Math.max(
      yp?.progress ?? 0,
      labsTotal === 0 ? 0 : Math.round((labsCompleted / labsTotal) * 100),
    )
    const isLocked = !priorYearComplete
    years.push({
      id: yr.id,
      orderIndex: yr.order_index,
      title: yr.title,
      progress,
      labsCompleted,
      labsTotal,
      isLocked,
    })
    priorYearComplete = progress >= 100
  }

  // ---------------------------------------------------------------------------
  // 4. Current position + resume card
  // ---------------------------------------------------------------------------
  const isNewLearner = (labProgressRows ?? []).length === 0

  // Find first unlocked, incomplete year.
  const currentYear = years.find((y) => !y.isLocked && y.progress < 100)
  const completedAllYears = !currentYear && years.every((y) => y.progress >= 100)

  // Within currentYear, find the next incomplete content item by
  // order. We don't navigate to it directly anymore (items live inline
  // inside the phase view) but we still need its index/title to drive
  // the dashboard's position + resume copy.
  let currentLabEntry: { lab: (typeof allLabs)[number]; index: number } | null =
    null
  let startPhaseId: string | null = null
  if (currentYear) {
    const labsInYear = labsByYear.get(currentYear.id) ?? []
    for (let i = 0; i < labsInYear.length; i++) {
      const lab = labsInYear[i]
      const lp = labProgressByLab.get(lab.id)
      const done = lp?.status === 'complete' || (lp?.progress ?? 0) >= 100
      if (!done) {
        currentLabEntry = { lab, index: i + 1 }
        break
      }
    }
    // The "Get Started" CTA always drops the fellow into the current
    // phase itself; from there they can pick whichever item they
    // want to start with.
    startPhaseId = currentYear.id
  }

  const position: DashboardPosition = (() => {
    if (completedAllYears) {
      return { year: 4, currentLab: 1, totalLabs: 1 }
    }
    if (!currentYear || !currentLabEntry) {
      return { year: 1, currentLab: 1, totalLabs: Math.max(1, years[0]?.labsTotal ?? 1) }
    }
    return {
      year: currentYear.orderIndex,
      currentLab: currentLabEntry.index,
      totalLabs: currentYear.labsTotal,
    }
  })()

  // Resume card: shown whenever the fellow has *any* completed item in
  // the current phase. It deep-links them back to the phase view (no
  // per-item detail page exists in the new content model) and labels
  // the CTA with the next incomplete item's title so they know what
  // they'll pick up.
  let resume: DashboardResume | null = null
  if (currentYear && currentLabEntry) {
    const phaseProgress = currentYear.progress
    if (phaseProgress > 0 && phaseProgress < 100) {
      resume = {
        phaseId: currentYear.id,
        phaseTitle: currentYear.title,
        nextItemTitle: currentLabEntry.lab.title,
        progress: phaseProgress,
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 5. Upcoming session (within 7 days, user's cohort)
  // ---------------------------------------------------------------------------
  const { data: cohortMemberships } = await supabase
    .from('cohort_members')
    .select('cohort_id, cohort:cohorts(id, name)')
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
  // 6. Team: user's first cohort + members with year progress
  // ---------------------------------------------------------------------------
  let team: DashboardTeam | null = null
  const primaryCohort = (cohortMemberships ?? [])[0]
  if (primaryCohort?.cohort) {
    const { data: peers } = await supabase
      .from('cohort_members')
      .select('profile_id, profiles:profiles(id, full_name, avatar_url)')
      .eq('cohort_id', primaryCohort.cohort_id)

    const peerIds = (peers ?? [])
      .map((p) => p.profile_id)
      .filter((id) => id !== user.id)

    let peerProgressByProfile = new Map<string, number>()
    if (peerIds.length > 0 && currentYear) {
      const { data: peerProgress } = await supabase
        .from('user_year_progress')
        .select('profile_id, progress')
        .eq('year_id', currentYear.id)
        .in('profile_id', peerIds)
      peerProgressByProfile = new Map(
        (peerProgress ?? []).map((row) => [row.profile_id, row.progress ?? 0]),
      )
    }

    const members: DashboardTeammate[] = (peers ?? [])
      .filter((p) => p.profile_id !== user.id && p.profiles)
      .map((p) => {
        const fullName = p.profiles?.full_name ?? 'Unknown'
        return {
          id: p.profile_id,
          name: fullName,
          initials: initialsFor(fullName),
          progress: peerProgressByProfile.get(p.profile_id) ?? 0,
        }
      })

    const cohortRecord = Array.isArray(primaryCohort.cohort)
      ? primaryCohort.cohort[0]
      : primaryCohort.cohort
    team = {
      cohortId: primaryCohort.cohort_id,
      cohortName: cohortRecord?.name ?? 'Your cohort',
      members,
    }
  }

  // ---------------------------------------------------------------------------
  // 7. Announcements (RLS already scopes audience)
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

  return {
    user,
    position,
    isNewLearner,
    resume,
    startPhaseId,
    years,
    upcomingSession,
    team,
    announcements,
  }
}
