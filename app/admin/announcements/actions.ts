'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth-server'

export type AnnouncementScope = 'global' | 'year' | 'cohort'

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
 * Resolve and lightly validate the optional curriculum-content pin.
 * - When the picker is left blank we persist NULL.
 * - When a lab id is supplied we confirm it actually exists so a
 *   stale or hand-edited form value can't introduce a dangling FK
 *   (the column is also a real FK with on-delete-set-null, but the
 *   explicit existence check yields a friendlier error message than
 *   a Postgres 23503 surfaced to the user).
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
 * Map the audience_scope + the two nullable target ids into a strictly
 * valid (scope, year_id, cohort_id) tuple that satisfies the DB check
 * constraint. Rejects invalid combinations early with a clear error.
 */
function resolveScopeTargets(
  scope: AnnouncementScope,
  yearId: string | null,
  cohortId: string | null,
): { year_id: string | null; cohort_id: string | null } {
  if (scope === 'global') {
    return { year_id: null, cohort_id: null }
  }
  if (scope === 'year') {
    if (!yearId) throw new Error('Year is required for year-scoped announcements')
    return { year_id: yearId, cohort_id: null }
  }
  if (!cohortId) {
    throw new Error('Cohort is required for cohort-scoped announcements')
  }
  return { year_id: null, cohort_id: cohortId }
}

// --------------------------------------------------------------------
// Create
// --------------------------------------------------------------------

export async function createAnnouncement(fd: FormData) {
  const admin = await requireAdmin()
  const supabase = await createClient()

  const scope = (requiredString(fd, 'audience_scope') as AnnouncementScope)
  const targets = resolveScopeTargets(
    scope,
    optionalString(fd, 'year_id'),
    optionalString(fd, 'cohort_id'),
  )
  // Optional pin to an existing curriculum item. Validated so stale
  // form values can't create dangling references.
  const contentId = await resolveContentId(supabase, optionalString(fd, 'content_id'))

  const { error } = await supabase.from('announcements').insert({
    author_id: admin.id,
    audience_scope: scope,
    year_id: targets.year_id,
    cohort_id: targets.cohort_id,
    title: requiredString(fd, 'title'),
    body: requiredString(fd, 'body'),
    pinned: fd.get('pinned') === 'on',
    content_id: contentId,
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
  const scope = (requiredString(fd, 'audience_scope') as AnnouncementScope)
  const targets = resolveScopeTargets(
    scope,
    optionalString(fd, 'year_id'),
    optionalString(fd, 'cohort_id'),
  )
  // We always write content_id explicitly (null clears any prior pin,
  // a uuid sets/replaces it). The picker submits an empty string when
  // the curator chooses "No content"; resolveContentId maps both that
  // and missing fields to NULL.
  const contentId = await resolveContentId(supabase, optionalString(fd, 'content_id'))

  const { error } = await supabase
    .from('announcements')
    .update({
      audience_scope: scope,
      year_id: targets.year_id,
      cohort_id: targets.cohort_id,
      title: requiredString(fd, 'title'),
      body: requiredString(fd, 'body'),
      pinned: fd.get('pinned') === 'on',
      content_id: contentId,
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
// Toggle pin (small convenience action for the list row)
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
