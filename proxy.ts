import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

/**
 * Next.js 16 root proxy. This is the modern replacement for
 * `middleware.ts` and runs on every request matched by `config.matcher`.
 *
 * Responsibility: refresh the Supabase auth-session cookies at the edge
 * so downstream Server Components don't have to round-trip to Supabase
 * Auth on every render. That's the single biggest lever for shaving
 * click-to-content latency on protected pages.
 *
 * Auth enforcement still also happens inside `requireUser()` per page
 * as a second line of defense - the proxy is for performance, not
 * primary authorization.
 */
export async function proxy(request: NextRequest): Promise<Response> {
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
