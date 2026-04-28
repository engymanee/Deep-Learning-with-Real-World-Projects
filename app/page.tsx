import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-server'

/**
 * Role-aware landing. Anonymous visitors go to /auth/login, fellows
 * (and facilitators) go to /dashboard, and admins drop straight into
 * the admin console. We funnel post-login navigation through here so
 * the destination logic lives in one place.
 *
 * Note: a previewing admin's `getCurrentUser()` returns the impersonated
 * fellow, so they correctly land on /dashboard until they exit preview.
 */
export default async function Home() {
  const user = await getCurrentUser()
  if (!user) redirect('/auth/login')
  if (user.role === 'admin') redirect('/admin')
  redirect('/dashboard')
}
