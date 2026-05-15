import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/lib/roles'
import { isCohort } from '@/lib/cohorts'
import { readPreviewCookie } from '@/lib/admin-preview'
import type { CurrentUser, PreviewMeta } from '@/lib/user-context'

export interface ProfileRow {
  id: string
  full_name: string | null
  email: string | null
  title: string | null
  avatar_url: string | null
  role: UserRole
  school_id: string | null
  deactivated_at: string | null
  cohort: string | null
  // Embedded school via FK relationship - one extra join, no extra round-trip.
  schools: { name: string | null } | null
}

function buildUserFromProfile(
  profile: ProfileRow,
  fallbackEmail: string,
  preview?: PreviewMeta,
): CurrentUser {
  return {
    id: profile.id,
    email: profile.email ?? fallbackEmail ?? '',
    fullName: profile.full_name ?? fallbackEmail ?? 'Unknown User',
    role: profile.role,
    schoolName: profile.schools?.name ?? '',
    // The "school team" the rest of the app keys off of - same as the
    // profile's school assignment. Without this, /team never finds a
    // team for any fellow and falls into the unassigned empty state.
    schoolTeamId: profile.school_id ?? undefined,
    profileImageUrl: profile.avatar_url ?? undefined,
    bio: profile.title ?? undefined,
    cohort: isCohort(profile.cohort) ? profile.cohort : null,
    preview,
  }
}

/**
 * Read the signed-in user + their profile + school metadata.
 * Returns null if there is no session.
 *
 * Wrapped in React's per-request `cache()` so that calling
 * `getCurrentUser()` (and through it `requireUser`/`requireAdmin`) from
 * multiple server components on the same request hits Supabase exactly
 * once.
 *
 * If the real user is an admin and they have started a "Preview as
 * fellow" session, this returns a synthesized fellow user with a
 * `preview` marker - so the rest of the app renders fellow-side UI.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return null

    const { data: profile } = await supabase
      .from('profiles')
      .select(
        'id, full_name, email, title, avatar_url, role, school_id, deactivated_at, cohort, schools(name)',
      )
      .eq('id', user.id)
      .maybeSingle<ProfileRow>()

    // No profile row yet - minimal fallback so the UI can still render.
    if (!profile) {
      return {
        id: user.id,
        email: user.email ?? '',
        fullName:
          (user.user_metadata?.full_name as string | undefined) ??
          (user.email ?? 'Unknown User'),
        role: 'fellow',
        schoolName: '',
      }
    }

    // Admins may be in a preview session impersonating a fellow.
    if (profile.role === 'admin') {
      const preview = await readPreviewCookie()
      if (preview) {
        const meta: Omit<PreviewMeta, 'label' | 'mode'> = {
          actualAdminId: profile.id,
          actualAdminName: profile.full_name ?? user.email ?? 'Admin',
        }

        if (preview.type === 'by_fellow') {
          const { data: target } = await supabase
            .from('profiles')
            .select(
              'id, full_name, email, title, avatar_url, role, school_id, deactivated_at, cohort, schools(name)',
            )
            .eq('id', preview.fellowId)
            .maybeSingle<ProfileRow>()

          if (target && target.role === 'fellow') {
            return buildUserFromProfile(target, target.email ?? '', {
              ...meta,
              mode: 'by_fellow',
              label: target.full_name ?? target.email ?? 'Fellow',
            })
          }
          // Falls through if the target is missing or no longer a fellow.
        }

        if (preview.type === 'by_cohort') {
          // Synthesize a generic fellow in the requested cohort. No real
          // ID, no progress, no school - just enough for cohort gating.
          const synthetic: CurrentUser = {
            id: '__preview__',
            email: profile.email ?? user.email ?? '',
            fullName: `Cohort ${preview.cohort} preview`,
            role: 'fellow',
            schoolName: '',
            cohort: preview.cohort,
            preview: {
              ...meta,
              mode: 'by_cohort',
              label: `Cohort ${preview.cohort}`,
            },
          }
          return synthetic
        }
      }
    }

    return buildUserFromProfile(profile, user.email ?? '')
  } catch (error) {
    // If Supabase client initialization fails (e.g., missing env vars or during build),
    // log the error and return null. This allows the app to render without crashing
    // even if Supabase is temporarily unavailable.
    console.error('[v0] Error in getCurrentUser:', error instanceof Error ? error.message : String(error))
    return null
  }
})

/** Server-side guard: redirect to /auth/login if unauthenticated. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (!user) redirect('/auth/login')
  return user
}

/**
 * Server-side guard: redirect to /dashboard if not an admin.
 *
 * Always evaluates the *real* underlying account, ignoring any active
 * "preview as fellow" cookie. Admin surfaces stay reachable while a
 * preview is running so the admin can navigate back, exit preview, or
 * jump to another management screen without losing access.
 */
export async function requireAdmin(): Promise<CurrentUser> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'id, full_name, email, title, avatar_url, role, school_id, deactivated_at, cohort, schools(name)',
    )
    .eq('id', user.id)
    .maybeSingle<ProfileRow>()

  if (!profile || profile.role !== 'admin') redirect('/dashboard')
  return buildUserFromProfile(profile, user.email ?? '')
}
