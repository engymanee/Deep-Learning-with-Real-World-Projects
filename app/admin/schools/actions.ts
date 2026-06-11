'use server'

import { revalidatePath } from 'next/cache'
import { put } from '@vercel/blob'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth-server'

export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string }

function ok(message: string): ActionResult {
  return { ok: true, message }
}
function fail(message: string): ActionResult {
  return { ok: false, message }
}

// ---------------------------------------------------------------------------
// Schools
// ---------------------------------------------------------------------------

export async function createSchoolAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin()
    const name = String(formData.get('name') ?? '').trim()
    const iconFile = formData.get('icon') as File | null
    if (!name) return fail('Name is required')

    let iconUrl: string | null = null
    if (iconFile && iconFile.size > 0) {
      try {
        // Validate file size (5MB max)
        if (iconFile.size > 5 * 1024 * 1024) {
          return fail('Icon file must be less than 5 MB')
        }

        // Validate MIME type
        const validTypes = ['image/png', 'image/jpeg', 'image/webp']
        if (!validTypes.includes(iconFile.type)) {
          return fail('Icon must be PNG, JPG, or WebP')
        }

        const blob = await put(`schools/${name}-${Date.now()}`, iconFile, {
          access: 'public',
        })
        iconUrl = blob.url
      } catch (blobErr) {
        return fail(`Failed to upload icon: ${blobErr instanceof Error ? blobErr.message : 'Unknown error'}`)
      }
    }

    const admin = createAdminClient()
    const { error } = await admin.from('schools').insert({ name, icon_url: iconUrl })
    if (error) return fail(error.message)

    revalidatePath('/admin/schools')
    return ok(`Added ${name}`)
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Unknown error')
  }
}

export async function renameSchoolAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin()
    const id = String(formData.get('id') ?? '')
    const name = String(formData.get('name') ?? '').trim()
    if (!id) return fail('Missing id')
    if (!name) return fail('Name is required')

    const admin = createAdminClient()
    const { error } = await admin.from('schools').update({ name }).eq('id', id)
    if (error) return fail(error.message)

    revalidatePath('/admin/schools')
    return ok('School renamed')
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Unknown error')
  }
}

export async function deleteSchoolAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin()
    const id = String(formData.get('id') ?? '')
    if (!id) return fail('Missing id')

    const admin = createAdminClient()

    // Guard: refuse if anyone is still assigned here.
    const { count } = await admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', id)
    if ((count ?? 0) > 0) {
      return fail('Move or remove members before deleting this school')
    }

    const { error } = await admin.from('schools').delete().eq('id', id)
    if (error) return fail(error.message)

    revalidatePath('/admin/schools')
    return ok('School deleted')
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Unknown error')
  }
}

// ---------------------------------------------------------------------------
// Cohorts (a.k.a. school teams)
// ---------------------------------------------------------------------------

export async function createCohortAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin()
    const schoolId = String(formData.get('schoolId') ?? '')
    const name = String(formData.get('name') ?? '').trim()
    const currentYear = Math.max(
      1,
      Math.min(3, Number(formData.get('currentYear') ?? 1)),
    )
    if (!schoolId) return fail('Missing school')
    if (!name) return fail('Team name is required')

    const admin = createAdminClient()
    const { error } = await admin
      .from('cohorts')
      .insert({ school_id: schoolId, name, current_year: currentYear })
    if (error) return fail(error.message)

    revalidatePath('/admin/schools')
    return ok(`Added ${name}`)
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Unknown error')
  }
}

export async function updateCohortAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin()
    const id = String(formData.get('id') ?? '')
    const name = String(formData.get('name') ?? '').trim()
    const currentYear = Math.max(
      1,
      Math.min(3, Number(formData.get('currentYear') ?? 1)),
    )
    if (!id) return fail('Missing id')
    if (!name) return fail('Team name is required')

    const admin = createAdminClient()
    const { error } = await admin
      .from('cohorts')
      .update({ name, current_year: currentYear })
      .eq('id', id)
    if (error) return fail(error.message)

    revalidatePath('/admin/schools')
    return ok('Team updated')
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Unknown error')
  }
}

export async function deleteCohortAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin()
    const id = String(formData.get('id') ?? '')
    if (!id) return fail('Missing id')

    const admin = createAdminClient()
    // Remove memberships first (no cascade on this FK).
    const { error: delMemErr } = await admin
      .from('cohort_members')
      .delete()
      .eq('cohort_id', id)
    if (delMemErr) return fail(delMemErr.message)

    const { error } = await admin.from('cohorts').delete().eq('id', id)
    if (error) return fail(error.message)

    revalidatePath('/admin/schools')
    return ok('Team deleted')
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Unknown error')
  }
}

// ---------------------------------------------------------------------------
// Membership
// ---------------------------------------------------------------------------

export async function addMemberAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin()
    const cohortId = String(formData.get('cohortId') ?? '')
    const profileId = String(formData.get('profileId') ?? '')
    if (!cohortId || !profileId) return fail('Missing cohort or profile')

    const admin = createAdminClient()

    // Also ensure the profile's school_id matches the cohort's school, so the
    // Team column + cohort-scoped queries stay consistent.
    const { data: cohort, error: cErr } = await admin
      .from('cohorts')
      .select('school_id')
      .eq('id', cohortId)
      .single()
    if (cErr || !cohort) return fail(cErr?.message ?? 'Team not found')

    const { error: memErr } = await admin
      .from('cohort_members')
      .insert({ cohort_id: cohortId, profile_id: profileId })
    if (memErr && !memErr.message.toLowerCase().includes('duplicate')) {
      return fail(memErr.message)
    }

    const { error: profErr } = await admin
      .from('profiles')
      .update({ school_id: cohort.school_id })
      .eq('id', profileId)
    if (profErr) return fail(profErr.message)

    revalidatePath('/admin/schools')
    return ok('Added to team')
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Unknown error')
  }
}

export async function removeMemberAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin()
    const cohortId = String(formData.get('cohortId') ?? '')
    const profileId = String(formData.get('profileId') ?? '')
    if (!cohortId || !profileId) return fail('Missing cohort or profile')

    const admin = createAdminClient()
    const { error } = await admin
      .from('cohort_members')
      .delete()
      .eq('cohort_id', cohortId)
      .eq('profile_id', profileId)
    if (error) return fail(error.message)

    revalidatePath('/admin/schools')
    return ok('Removed from team')
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Unknown error')
  }
}
