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

  const { error } = await supabase.from('announcements').insert({
    author_id: admin.id,
    audience_scope: scope,
    year_id: targets.year_id,
    cohort_id: targets.cohort_id,
    title: requiredString(fd, 'title'),
    body: requiredString(fd, 'body'),
    pinned: fd.get('pinned') === 'on',
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

  const { error } = await supabase
    .from('announcements')
    .update({
      audience_scope: scope,
      year_id: targets.year_id,
      cohort_id: targets.cohort_id,
      title: requiredString(fd, 'title'),
      body: requiredString(fd, 'body'),
      pinned: fd.get('pinned') === 'on',
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
