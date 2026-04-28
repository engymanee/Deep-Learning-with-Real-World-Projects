import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

/**
 * Next.js 16 proxy (the successor to middleware.ts). Runs on every
 * request matched by `config.matcher` and refreshes the Supabase session
 * cookies at the edge so that downstream Server Components don't have
 * to round-trip to Supabase Auth every render. This is the single
 * biggest perf lever for protected-page navigation latency.
 *
 * It also enforces auth on protected paths so we don't depend solely
 * on `requireUser()` redirects inside each page (those still run as a
 * second line of defense).
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon and common image extensions
     * - any file with a "." (static asset hint)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
