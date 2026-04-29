/**
 * Shared profile shape used by the Team page, the Community Fellow
 * Bios grid, and the modal ProfileView. Kept narrow on purpose -
 * the fields here are the ones that actually render. The DB select
 * lists in the page-level loaders mirror this shape so we don't
 * accidentally over-fetch.
 */
export interface DirectoryProfile {
  id: string
  full_name: string | null
  email: string | null
  title: string | null
  bio: string | null
  avatar_url: string | null
  /** 'fellow' | 'facilitator' | 'admin' from the DB. */
  role: string | null
  cohort: string | null
  /**
   * Primary school leadership team name (alphabetical first when a
   * member is on multiple teams). Used as the chip on the card and
   * the modal. Nullable for admins / fellows not yet assigned to a
   * team.
   */
  school_name: string | null
  /**
   * Full list of school team names the member belongs to. Drives
   * the team-filter dropdown so a member on two teams shows up
   * under either filter. Optional for backwards compatibility with
   * call-sites that only populate `school_name`.
   */
  school_names?: string[]
}

/** Display-only role label: hides 'admin' from non-admin contexts. */
export function roleLabelFor(role: string | null | undefined): string {
  if (role === 'facilitator') return 'Facilitator'
  if (role === 'admin') return 'Admin'
  return 'Fellow'
}

/**
 * Two-letter avatar fallback. Falls back to '?' rather than '' so
 * we never render a hollow circle, which reads as a loading state.
 */
export function initialsFor(
  name: string | null | undefined,
  email: string | null | undefined,
): string {
  const source = (name?.trim() || email?.trim() || '').replace(/[._-]+/g, ' ')
  if (!source) return '?'
  const parts = source.split(/\s+/).filter(Boolean).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase()).join('') || '?'
}
