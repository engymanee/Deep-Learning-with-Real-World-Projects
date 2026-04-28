import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/lib/roles'
import type { CurrentUser } from '@/lib/user-context'

export interface ProfileRow {
  id: string
  full_name: string | null
  email: string | null
  title: string | null
  avatar_url: string | null
  role: UserRole
  school_id: string | null
  deactivated_at: string | null
  // Embedded school via FK relationship - one extra join, no extra round-trip.
  schools: { name: string | null } | null
}

/**
 * Read the signed-in user + their profile + school metadata.
 * Returns null if there is no session.
 *
 * Wrapped in React's per-request `cache()` so that calling
 * `getCurrentUser()` (and through it `requireUser`/`requireAdmin`) from
 * multiple server components on the same request hits Supabase exactly
 * once. Without this the dashboard was firing the same `auth.getUser`
 * + profile lookup pair repeatedly, which both wasted requests and was
 * fast-tracking the dev server toward OOM crashes.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'id, full_name, email, title, avatar_url, role, school_id, deactivated_at, schools(name)',
    )
    .eq('id', user.id)
    .maybeSingle<ProfileRow>()

  // If there's an auth user but no profile row yet (edge case: trigger
  // didn't fire, or profile was deleted), fall back to minimal identity
  // so the UI can still render.
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

  return {
    id: profile.id,
    email: profile.email ?? user.email ?? '',
    fullName: profile.full_name ?? user.email ?? 'Unknown User',
    role: profile.role,
    schoolName: profile.schools?.name ?? '',
    profileImageUrl: profile.avatar_url ?? undefined,
    bio: profile.title ?? undefined,
  }
})

/** Server-side guard: redirect to /auth/login if unauthenticated. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (!user) redirect('/auth/login')
  return user
}

/** Server-side guard: redirect to /dashboard if not an admin. */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser()
  if (user.role !== 'admin') redirect('/dashboard')
  return user
}
