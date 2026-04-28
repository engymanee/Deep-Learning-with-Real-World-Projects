import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * OAuth / invite / recovery landing endpoint.
 *
 * Supabase's email templates all point at `{SITE_URL}/auth/callback?code=...
 * &next=...` (with PKCE). Invite emails in particular follow the flow:
 *
 *   email link -> Supabase verify endpoint -> /auth/callback?code=...&next=/auth/set-password
 *
 * We exchange the one-time code for a real session (which sets the auth
 * cookies on this response), then redirect to `next`. If the code is
 * missing, already used, or expired we bounce to `/auth/error` with a
 * short explanation so the admin can resend.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const errorDescription = searchParams.get('error_description')
  // Default to "/" so the root page's role-aware redirect picks the
  // right home (admins -> /admin, everyone else -> /dashboard).
  const rawNext = searchParams.get('next') ?? '/'

  // Only allow relative redirects to prevent open-redirect abuse.
  const next = rawNext.startsWith('/') ? rawNext : '/'

  if (errorDescription) {
    return NextResponse.redirect(
      `${origin}/auth/error?message=${encodeURIComponent(errorDescription)}`,
    )
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}/auth/error?message=${encodeURIComponent('Missing sign-in code')}`,
    )
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(
      `${origin}/auth/error?message=${encodeURIComponent(error.message)}`,
    )
  }

  return NextResponse.redirect(`${origin}${next}`)
}
