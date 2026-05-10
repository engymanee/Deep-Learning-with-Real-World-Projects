import { NextRequest, NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

/**
 * OAuth / invite / recovery landing endpoint.
 *
 * Supports both link formats so older invitation emails keep working:
 *
 * 1. PKCE code exchange (Supabase hosted email templates, OAuth):
 *      /auth/callback?code=...&next=...
 *
 * 2. OTP token-hash verify (our Resend-sent invitation/magiclink/recovery
 *    emails, before we moved them to /auth/confirm):
 *      /auth/callback?token_hash=...&type=invite&next=...
 *
 * In both cases we set the session cookies on this response and redirect
 * to `next`. Failures bounce to /auth/error with a short reason so the
 * admin can resend.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const errorDescription = searchParams.get('error_description')
  // Default to "/" so the root page's role-aware redirect picks the
  // right home (admins -> /admin, everyone else -> /dashboard).
  const rawNext = searchParams.get('next') ?? '/'

  // Only allow relative redirects to prevent open-redirect abuse.
  const next = rawNext.startsWith('/') ? rawNext : '/'

  console.log('[v0] /auth/callback hit', {
    hasCode: !!code,
    hasTokenHash: !!tokenHash,
    type,
    next,
    errorDescription,
  })

  if (errorDescription) {
    return NextResponse.redirect(
      `${origin}/auth/error?message=${encodeURIComponent(errorDescription)}`,
    )
  }

  const supabase = await createClient()

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      console.log('[v0] exchangeCodeForSession failed', error.message)
      return NextResponse.redirect(
        `${origin}/auth/error?message=${encodeURIComponent(error.message)}`,
      )
    }
    return NextResponse.redirect(`${origin}${next}`)
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (error) {
      console.log('[v0] verifyOtp failed', error.message)
      return NextResponse.redirect(
        `${origin}/auth/error?message=${encodeURIComponent(error.message)}`,
      )
    }
    return NextResponse.redirect(`${origin}${next}`)
  }

  return NextResponse.redirect(
    `${origin}/auth/error?message=${encodeURIComponent('Missing sign-in code')}`,
  )
}
