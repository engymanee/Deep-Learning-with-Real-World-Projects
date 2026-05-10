import { NextRequest, NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

/**
 * Email-OTP confirmation endpoint.
 *
 * Used by branded invitation / magic-link / recovery emails that we
 * send through Resend. Instead of letting Supabase's hosted verify
 * endpoint try to bounce back with a PKCE `?code=` (which it won't
 * do for `generateLink`-based flows on @supabase/ssr), we build the
 * email link ourselves as:
 *
 *   {SITE_URL}/auth/confirm?token_hash=<hash>&type=<otp_type>&next=<path>
 *
 * and verify the OTP server-side here. This is the canonical pattern
 * for "server-side auth with PKCE flow" in @supabase/ssr.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const rawNext = searchParams.get('next') ?? '/'

  // Only allow relative redirects to prevent open-redirect abuse.
  const next = rawNext.startsWith('/') ? rawNext : '/'

  if (!tokenHash || !type) {
    return NextResponse.redirect(
      `${origin}/auth/error?message=${encodeURIComponent('Missing or invalid confirmation token')}`,
    )
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })

  if (error) {
    return NextResponse.redirect(
      `${origin}/auth/error?message=${encodeURIComponent(error.message)}`,
    )
  }

  return NextResponse.redirect(`${origin}${next}`)
}
