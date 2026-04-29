'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth-server'

/**
 * Audience scopes the curator can pick from. The DB still allows a
 * legacy `year` value for historical rows, but the picker no longer
 * offers it - new and edited announcements always land in one of
 * these four scopes.
 *
 * - global       : visible to everyone signed-in
 * - cohort       : visible to fellows whose profile.cohort is in cohort_codes (A/B/C)
 * - school_team  : visible to fellows whose cohort_members row matches one of school_team_ids
 * - users        : visible only to the explicit profiles.id list in user_ids
 */
export type AnnouncementScope = 'global' | 'cohort' | 'school_team' | 'users'

const VALID_COHORT_CODES = ['A', 'B', 'C'] as const
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// --------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------

function requiredString(fd: FormData, key: string): string {
  const v = fd.get(key)
  if (typeof v !== 'string' || v.trim() === '') {
    throw new Error(`Missing required field: ${key}`)
  }
  return v.trim()
}

function optionalString(fd: FormData, key: string): string | null {
  const v = fd.get(key)
  if (typeof v !== 'string' || v.trim() === '') return null
  return v.trim()
}

/**
 * Read a multi-valued form field, trim entries, drop empties, and
 * deduplicate (so accidental double-clicks on a checkbox don't write
 * `["A","A"]`).
 */
function multiString(fd: FormData, key: string): string[] {
  const seen = new Set<string>()
  for (const raw of fd.getAll(key)) {
    if (typeof raw !== 'string') continue
    const v = raw.trim()
    if (v === '') continue
    seen.add(v)
  }
  return [...seen]
}

/**
 * Validate the optional curriculum-content pin. NULL when omitted; an
 * explicit existence check on `labs` so a stale or hand-edited form
 * value yields a friendlier error than the raw FK violation.
 */
async function resolveContentId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  raw: string | null,
): Promise<string | null> {
  if (!raw) return null
  const { data, error } = await supabase
    .from('labs')
    .select('id')
    .eq('id', raw)
    .maybeSingle<{ id: string }>()
  if (error) throw error
  if (!data) {
    throw new Error('That curriculum item could not be found. Please pick another.')
  }
  return data.id
}

/**
 * Resolve scope + the three array inputs into a strict, fully-typed
 * payload that satisfies the DB scope_targets check constraint. Each
 * non-global scope must carry at least one matching target id; we
 * blank the other arrays so the row is unambiguous.
 *
 * Also validates target ids: cohort codes must be one of A/B/C, and
 * uuid arrays must look like uuids. The DB has its own checks too,
 * but doing it here yields better error messages.
 */
async function resolveAudience(
  supabase: Awaited<ReturnType<typeof createClient>>,
  scope: AnnouncementScope,
  cohortCodes: string[],
  schoolTeamIds: string[],
  userIds: string[],
): Promise<{
  audience_scope: AnnouncementScope
  cohort_codes: string[] | null
  school_team_ids: string[] | null
  user_ids: string[] | null
  // legacy columns we keep nulled to avoid stale data
  year_id: string | null
  cohort_id: string | null
}> {
  if (scope === 'global') {
    return {
      audience_scope: 'global',
      cohort_codes: null,
      school_team_ids: null,
      user_ids: null,
      year_id: null,
      cohort_id: null,
    }
  }

  if (scope === 'cohort') {
    const cleaned = cohortCodes.filter((c) =>
      (VALID_COHORT_CODES as readonly string[]).includes(c),
    )
    if (cleaned.length === 0) {
      throw new Error('Pick at least one cohort (A, B, or C).')
    }
    return {
      audience_scope: 'cohort',
      cohort_codes: cleaned,
      school_team_ids: null,
      user_ids: null,
      year_id: null,
      cohort_id: null,
    }
  }

  if (scope === 'school_team') {
    const cleaned = schoolTeamIds.filter((id) => UUID_RE.test(id))
    if (cleaned.length === 0) {
      throw new Error('Pick at least one school team.')
    }
    // Sanity check: every id must exist.
    const { data: existing, error } = await supabase
      .from('cohorts')
      .select('id')
      .in('id', cleaned)
    if (error) throw error
    const found = new Set((existing ?? []).map((r) => r.id))
    const missing = cleaned.filter((id) => !found.has(id))
    if (missing.length > 0) {
      throw new Error(
        `One or more school teams could not be found. Please reselect.`,
      )
    }
    return {
      audience_scope: 'school_team',
      cohort_codes: null,
      school_team_ids: cleaned,
      user_ids: null,
      year_id: null,
      cohort_id: null,
    }
  }

  // scope === 'users'
  const cleaned = userIds.filter((id) => UUID_RE.test(id))
  if (cleaned.length === 0) {
    throw new Error('Pick at least one fellow.')
  }
  const { data: existingUsers, error: usersErr } = await supabase
    .from('profiles')
    .select('id')
    .in('id', cleaned)
  if (usersErr) throw usersErr
  const foundUsers = new Set((existingUsers ?? []).map((r) => r.id))
  const missingUsers = cleaned.filter((id) => !foundUsers.has(id))
  if (missingUsers.length > 0) {
    throw new Error('One or more fellows could not be found. Please reselect.')
  }
  return {
    audience_scope: 'users',
    cohort_codes: null,
    school_team_ids: null,
    user_ids: cleaned,
    year_id: null,
    cohort_id: null,
  }
}

// --------------------------------------------------------------------
// Create
// --------------------------------------------------------------------

export async function createAnnouncement(fd: FormData) {
  const admin = await requireAdmin()
  const supabase = await createClient()

  const scope = requiredString(fd, 'audience_scope') as AnnouncementScope
  const audience = await resolveAudience(
    supabase,
    scope,
    multiString(fd, 'cohort_codes'),
    multiString(fd, 'school_team_ids'),
    multiString(fd, 'user_ids'),
  )
  const contentId = await resolveContentId(
    supabase,
    optionalString(fd, 'content_id'),
  )

  const { error } = await supabase.from('announcements').insert({
    author_id: admin.id,
    title: requiredString(fd, 'title'),
    body: requiredString(fd, 'body'),
    pinned: fd.get('pinned') === 'on',
    content_id: contentId,
    ...audience,
  })
  if (error) throw error

  revalidatePath('/admin/announcements')
  revalidatePath('/dashboard')
}

// --------------------------------------------------------------------
// Update
// --------------------------------------------------------------------

export async function updateAnnouncement(fd: FormData) {
  await requireAdmin()
  const supabase = await createClient()

  const id = requiredString(fd, 'id')
  const scope = requiredString(fd, 'audience_scope') as AnnouncementScope
  const audience = await resolveAudience(
    supabase,
    scope,
    multiString(fd, 'cohort_codes'),
    multiString(fd, 'school_team_ids'),
    multiString(fd, 'user_ids'),
  )
  const contentId = await resolveContentId(
    supabase,
    optionalString(fd, 'content_id'),
  )

  const { error } = await supabase
    .from('announcements')
    .update({
      title: requiredString(fd, 'title'),
      body: requiredString(fd, 'body'),
      pinned: fd.get('pinned') === 'on',
      content_id: contentId,
      ...audience,
    })
    .eq('id', id)
  if (error) throw error

  revalidatePath('/admin/announcements')
  revalidatePath('/dashboard')
}

// --------------------------------------------------------------------
// Delete
// --------------------------------------------------------------------

export async function deleteAnnouncement(fd: FormData) {
  await requireAdmin()
  const supabase = await createClient()
  const id = requiredString(fd, 'id')

  const { error } = await supabase.from('announcements').delete().eq('id', id)
  if (error) throw error

  revalidatePath('/admin/announcements')
  revalidatePath('/dashboard')
}

// --------------------------------------------------------------------
// Toggle pin
// --------------------------------------------------------------------

export async function togglePinAnnouncement(fd: FormData) {
  await requireAdmin()
  const supabase = await createClient()
  const id = requiredString(fd, 'id')

  const { data: row, error: fetchErr } = await supabase
    .from('announcements')
    .select('pinned')
    .eq('id', id)
    .single<{ pinned: boolean }>()
  if (fetchErr) throw fetchErr

  const { error } = await supabase
    .from('announcements')
    .update({ pinned: !row.pinned })
    .eq('id', id)
  if (error) throw error

  revalidatePath('/admin/announcements')
  revalidatePath('/dashboard')
}
