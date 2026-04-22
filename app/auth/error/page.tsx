import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * Landing page for auth failures. Called from two places:
 *  - `/auth/callback` when the invite / recovery / OAuth code fails.
 *  - Supabase's hosted templates which pass `?error=...`.
 *
 * We accept either `message` or `error` so both flows render sensibly.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>
}) {
  const params = await searchParams
  const detail = params?.message ?? params?.error ?? null

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-2xl">
              We couldn&apos;t sign you in
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              {detail
                ? `Reason: ${detail}`
                : 'An unspecified error occurred.'}
            </p>
            <p className="text-sm text-muted-foreground">
              Invite links expire after 24 hours and can only be used once. If
              yours has expired, ask your program admin to resend it, or contact{' '}
              <a
                className="text-primary underline"
                href="mailto:waw@abigailadamsinstitute.org"
              >
                waw@abigailadamsinstitute.org
              </a>
              .
            </p>
            <Button asChild variant="outline" className="self-start">
              <Link href="/auth/login">Back to sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
