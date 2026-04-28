'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth-server'
import type { Role } from '@/lib/roles'
import { isCohort, type Cohort } from '@/lib/cohorts'

const ROLES: readonly Role[] = ['fellow', 'facilitator', 'admin'] as const

/**
 * Returns the absolute URL the Supabase invite email should redirect to.
 * Prefers NEXT_PUBLIC_SITE_URL, falls back to the request origin so this
 * keeps working in preview deployments without extra config.
 */
async function inviteRedirectUrl(): Promise<string | undefined> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL
  if (configured) {
    return `${configured.replace(/\/$/, '')}/auth/callback?next=/auth/set-password`
  }
  try {
    const h = await headers()
    const host = h.get('x-forwarded-host') ?? h.get('host')
    const proto = h.get('x-forwarded-proto') ?? 'https'
    if (host) return `${proto}://${host}/auth/callback?next=/auth/set-password`
  } catch {
    // headers() may not be available in all contexts; fall through.
  }
  return undefined
}

function ok(message: string) {
  return { ok: true as const, message }
}
function fail(message: string) {
  return { ok: false as const, message }
}

export type ActionResult = { ok: true; message: string } | { ok: false; message: string }

function assertRole(value: unknown): asserts value is Role {
  if (!ROLES.includes(value as Role)) {
    throw new Error(`Invalid role: ${String(value)}`)
  }
}

export async function inviteUserAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin()

    const email = String(formData.get('email') ?? '').trim().toLowerCase()
    const fullName = String(formData.get('fullName') ?? '').trim()
    const title = String(formData.get('title') ?? '').trim()
    const role = String(formData.get('role') ?? 'fellow')
    // schoolTeamId comes from the existing "cohorts" table, surfaced
    // in the UI as "School Team". cohortLetter is the A/B/C label
    // stored on profiles.cohort - only valid for fellows.
    const schoolTeamId = String(formData.get('cohortId') ?? '')
    const cohortLetterRaw = String(formData.get('cohortLetter') ?? '')

    if (!email) return fail('Email is required')
    if (!fullName) return fail('Full name is required')
    assertRole(role)

    // Cohorts are exclusively a program-fellow concept. Admins and
    // facilitators have unrestricted access to all curriculum and are
    // never bound to a cohort, so we silently drop any cohort value
    // submitted with a non-fellow role.
    const cohortLetter: Cohort | null =
      role === 'fellow' && isCohort(cohortLetterRaw) ? cohortLetterRaw : null

    const admin = createAdminClient()

    // Invite (sends email; the link runs /auth/callback to exchange the
    // code for a session, then sends the user to /auth/set-password).
    const redirectTo = await inviteRedirectUrl()

    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName, role },
      redirectTo,
    })

    if (error || !data.user) {
      return fail(error?.message ?? 'Failed to send invite')
    }

    const userId = data.user.id

    // The handle_new_user trigger created a profile row. Enrich it.
    const { error: profErr } = await admin
      .from('profiles')
      .update({
        full_name: fullName,
        title: title || null,
        role,
        cohort: cohortLetter,
      })
      .eq('id', userId)

    if (profErr) return fail(`Invited, but failed to save profile: ${profErr.message}`)

    if (schoolTeamId) {
      const { error: memErr } = await admin
        .from('cohort_members')
        .insert({ cohort_id: schoolTeamId, profile_id: userId })
      if (memErr && !memErr.message.includes('duplicate')) {
        return fail(`Invited, but failed to add to school team: ${memErr.message}`)
      }
    }

    revalidatePath('/admin/users')
    return ok(`Invite sent to ${email}`)
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Unknown error')
  }
}

export async function updateRoleAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin()
    const userId = String(formData.get('userId') ?? '')
    const role = String(formData.get('role') ?? '')
    if (!userId) return fail('Missing user id')
    assertRole(role)

    const admin = createAdminClient()

    // Cohort labels are fellow-only. Promoting a fellow to facilitator
    // or admin must clear their cohort - both to keep the data model
    // consistent (there's a CHECK constraint enforcing this) and to
    // reflect that admins/facilitators have unrestricted access.
    const update: { role: Role; cohort?: null } =
      role === 'fellow' ? { role } : { role, cohort: null }

    const { error } = await admin.from('profiles').update(update).eq('id', userId)
    if (error) return fail(error.message)

    revalidatePath('/admin/users')
    return ok('Role updated')
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Unknown error')
  }
}

/**
 * Updates the high-level cohort label (A/B/C) stored on profiles.cohort.
 * Empty string clears the cohort. This is the field that gates phase /
 * item / resource access for fellows in the user-facing UI.
 *
 * Refuses to set a cohort on any non-fellow profile. Admins and
 * facilitators are never cohort-scoped: they have full unrestricted
 * access to every curriculum item and library resource.
 */
export async function updateCohortLetterAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin()
    const userId = String(formData.get('userId') ?? '')
    const raw = String(formData.get('cohort') ?? '')
    if (!userId) return fail('Missing user id')

    const cohort: Cohort | null = isCohort(raw) ? raw : null
    if (raw && !cohort) return fail('Invalid cohort')

    const admin = createAdminClient()

    // Verify the target is actually a fellow before assigning a cohort.
    // (Clearing a cohort - cohort === null - is always allowed so we
    // can recover from any pre-constraint legacy data.)
    if (cohort) {
      const { data: target, error: tErr } = await admin
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle<{ role: Role }>()
      if (tErr) return fail(tErr.message)
      if (!target) return fail('User not found')
      if (target.role !== 'fellow') {
        return fail('Cohorts can only be assigned to fellows.')
      }
    }

    const { error } = await admin
      .from('profiles')
      .update({ cohort })
      .eq('id', userId)
    if (error) return fail(error.message)

    revalidatePath('/admin/users')
    return ok(cohort ? `Cohort set to ${cohort}` : 'Cohort cleared')
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Unknown error')
  }
}

/**
 * Updates a fellow's School Team membership. Kept under the legacy
 * "updateCohortAction" name and "cohortId" form field so older callers
 * (and the cohort_members table itself) don't need to be renamed.
 */
export async function updateCohortAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin()
    const userId = String(formData.get('userId') ?? '')
    const cohortId = String(formData.get('cohortId') ?? '')
    if (!userId) return fail('Missing user id')

    const admin = createAdminClient()

    // Simple model: a user belongs to at most one cohort at a time.
    const { error: delErr } = await admin.from('cohort_members').delete().eq('profile_id', userId)
    if (delErr) return fail(delErr.message)

    if (cohortId) {
      const { error: insErr } = await admin
        .from('cohort_members')
        .insert({ cohort_id: cohortId, profile_id: userId })
      if (insErr) return fail(insErr.message)
    }

    revalidatePath('/admin/users')
    return ok(cohortId ? 'Cohort updated' : 'Removed from cohort')
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Unknown error')
  }
}

export async function resendInviteAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin()
    const email = String(formData.get('email') ?? '').trim().toLowerCase()
    if (!email) return fail('Missing email')

    const admin = createAdminClient()
    const redirectTo = await inviteRedirectUrl()

    const { error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo })
    if (error) return fail(error.message)

    return ok(`Invite resent to ${email}`)
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Unknown error')
  }
}

/**
 * Permanently removes a user. We delete the Supabase Auth record first
 * (which triggers the ON DELETE CASCADE on profiles.id -> auth.users.id);
 * if no such cascade exists we follow up with an explicit profile delete
 * so the /admin/users list is always consistent. Cohort memberships,
 * progress rows, etc. are wiped by the FKs that reference profile_id.
 *
 * Admins cannot delete themselves - they'd lock themselves out of the
 * admin panel and there's no self-service recovery.
 */
export async function deleteUserAction(formData: FormData): Promise<ActionResult> {
  try {
    const me = await requireAdmin()
    const userId = String(formData.get('userId') ?? '').trim()
    if (!userId) return fail('Missing user id')
    if (userId === me.id) return fail('You cannot delete your own account')

    const admin = createAdminClient()

    // Auth deletion. If the user was already removed from auth.users
    // (e.g. manual DB surgery) we continue to the profile cleanup.
    const { error: authErr } = await admin.auth.admin.deleteUser(userId)
    if (authErr && !/user.*not found/i.test(authErr.message)) {
      return fail(authErr.message)
    }

    // Best-effort explicit profile cleanup. Ignored if the auth delete
    // already cascaded it away.
    await admin.from('profiles').delete().eq('id', userId)

    revalidatePath('/admin/users')
    return ok('User deleted')
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Unknown error')
  }
}

export async function toggleDeactivateAction(formData: FormData): Promise<ActionResult> {
  try {
    const me = await requireAdmin()
    const userId = String(formData.get('userId') ?? '')
    const deactivate = String(formData.get('deactivate') ?? '') === 'true'
    if (!userId) return fail('Missing user id')
    if (userId === me.id && deactivate) return fail('You cannot deactivate yourself')

    const admin = createAdminClient()

    const { error: profErr } = await admin
      .from('profiles')
      .update({ deactivated_at: deactivate ? new Date().toISOString() : null })
      .eq('id', userId)
    if (profErr) return fail(profErr.message)

    // Also ban/unban in auth so the user can't actually sign in.
    const { error: authErr } = await admin.auth.admin.updateUserById(userId, {
      ban_duration: deactivate ? '876000h' : 'none', // ~100y for "permanent" lockout
    })
    if (authErr) return fail(authErr.message)

    revalidatePath('/admin/users')
    return ok(deactivate ? 'User deactivated' : 'User reactivated')
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Unknown error')
  }
}
