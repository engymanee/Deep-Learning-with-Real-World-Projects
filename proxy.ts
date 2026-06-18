import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'
import { PREVIEW_COOKIE } from '@/lib/admin-preview'

/**
 * Next.js 16 root proxy. This is the modern replacement for
 * `middleware.ts` and runs on every request matched by `config.matcher`.
 *
 * Responsibility: 
 *   1. Refresh the Supabase auth-session cookies at the edge
 *      so downstream Server Components don't have to round-trip to Supabase
 *      Auth on every render. That's the single biggest lever for shaving
 *      click-to-content latency on protected pages.
 *   2. Enforce preview mode security: block all /admin routes when the
 *      preview cookie is set, redirecting to the fellow view. This ensures
 *      admins cannot bypass preview mode via URL manipulation.
 *
 * Auth enforcement still also happens inside `requireUser()` per page
 * as a second line of defense - the proxy is for performance, not
 * primary authorization.
 * 
 * Note: Cron routes are exempted from session refresh and allowed to pass through
 * with their own Authorization header validation.
 */
export async function proxy(request: NextRequest): Promise<Response> {
  // Skip session update for cron routes - they have their own auth via CRON_SECRET
  if (request.nextUrl.pathname.startsWith('/api/cron/')) {
    return NextResponse.next()
  }

  // Enforce preview mode security: block /admin routes when preview cookie is set
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const previewCookie = request.cookies.get(PREVIEW_COOKIE)
    if (previewCookie?.value) {
      // Admin is in preview mode - redirect to fellow view
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    // Run on every request except static assets and the Next.js
    // internal files. Anything with a literal "." is treated as a
    // static asset hint and skipped.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
}
