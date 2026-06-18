import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth-server'

/**
 * Sidebar data for the "My Team" dashboard:
 *  - the next upcoming community session
 *  - the team's most recent reflections
 *  - per-teammate "last active" timestamps
 *
 * "Team" === fellows in the same school team (via school_teams) as the current user.
 * We query via `school_team_id` (Phase 2), which links profiles to the (school, cohort) pair.
 * This ensures all teammates share the same school AND cohort.
 */

export interface UpcomingSession {
  id: string
  title: string
  starts_at: string
  /** ISO timestamp; null when the event is open-ended. */
  ends_at: string | null
  location: string | null
  meeting_url: string | null
}

export interface TeamReflection {
  id: string
  body: string
  visibility: 'public' | 'cohort' | 'private'
  created_at: string
  author: {
    id: string
    full_name: string | null
    email: string | null
    avatar_url: string | null
  } | null
  content_title: string | null
  lab_title: string | null
}

export interface TeamMemberLastSeen {
  /** profile id */
  id: string
  /** Best-effort proxy for "last active" until we ship a heartbeat. */
  last_seen_at: string | null
}

export interface TeamSidebarData {
  upcomingSession: UpcomingSession | null
  recentReflections: TeamReflection[]
  lastSeenById: Map<string, string | null>
}

/**
 * One round-trip per query, fanned out in parallel. The page already
 * runs `loadTeamProgress`, which fetches the teammate list - we
 * deliberately re-resolve teammates here so this loader stays
 * self-contained and the team page can compose them however it
 * wants without coupling.
 */
export async function loadTeamSidebar(): Promise<TeamSidebarData> {
  const user = await requireUser()
  const supabase = await createClient()

  if (!user.schoolTeamId) {
    return {
      upcomingSession: null,
      recentReflections: [],
      lastSeenById: new Map(),
    }
  }

  // Resolve teammates (same school team via school_teams, active fellows/facilitators).
  // We need the IDs to scope the reflection query, and the updated_at to populate the "last active" cell.
  // Query: profiles where school_team_id matches the user's school_team_id
  const { data: teamRows } = await supabase
    .from('profiles')
    .select('id, updated_at')
    .eq('school_team_id', user.schoolTeamId)
    .in('role', ['fellow', 'facilitator'])
    .is('deactivated_at', null)
    .returns<Array<{ id: string; updated_at: string | null }>>()

  const teammateIds = (teamRows ?? []).map((r) => r.id)
  const lastSeenById = new Map<string, string | null>()
  for (const row of teamRows ?? []) {
    lastSeenById.set(row.id, row.updated_at)
  }

  const [sessionRes, reflectionRes] = await Promise.all([
    // Next published event from "now". community_events doesn't
    // distinguish "team session" vs other event types reliably
    // across cohorts, so we just take the soonest one.
    supabase
      .from('community_events')
      .select(
        'id, title, starts_at, ends_at, location, meeting_url, published_at',
      )
      .gt('starts_at', new Date().toISOString())
      .not('published_at', 'is', null)
      .order('starts_at', { ascending: true })
      .limit(1)
      .maybeSingle<{
        id: string
        title: string
        starts_at: string
        ends_at: string | null
        location: string | null
        meeting_url: string | null
      }>(),
    teammateIds.length > 0
      ? supabase
          .from('user_content_reflections')
          .select(
            `
              id, body, visibility, created_at,
              profile:profiles!profile_id (
                id, full_name, email, avatar_url
              ),
              content:content_blocks (
                id, title,
                lab:labs (id, title)
              )
            `,
          )
          .in('profile_id', teammateIds)
          .neq('visibility', 'private')
          .order('created_at', { ascending: false })
          .limit(5)
          .returns<
            Array<{
              id: string
              body: string
              visibility: 'public' | 'cohort' | 'private'
              created_at: string
              profile: {
                id: string
                full_name: string | null
                email: string | null
                avatar_url: string | null
              } | null
              content: {
                id: string
                title: string | null
                lab: { id: string; title: string | null } | null
              } | null
            }>
          >()
      : Promise.resolve({ data: [] as never[] }),
  ])

  const recentReflections: TeamReflection[] = (
    reflectionRes.data ?? []
  ).map((r) => ({
    id: r.id,
    body: r.body,
    visibility: r.visibility,
    created_at: r.created_at,
    author: r.profile,
    content_title: r.content?.title ?? null,
    lab_title: r.content?.lab?.title ?? null,
  }))

  return {
    upcomingSession: sessionRes.data ?? null,
    recentReflections,
    lastSeenById,
  }
}
