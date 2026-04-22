'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * Landing page after an invitee clicks their email link. By the time
 * this component mounts, `/auth/callback` has already exchanged the
 * invite code for a real session cookie, so updateUser({ password })
 * will attach the new password to the already-authenticated user.
 *
 * We read the invited user's name off `auth.user_metadata.full_name`
 * (set by inviteUserByEmail in `actions.ts`) to personalise the greeting.
 */
export default function SetPasswordPage() {
  const [firstName, setFirstName] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [bootstrapped, setBootstrapped] = useState(false)
  const router = useRouter()

  // Check the invite session exists before the user fills the form. If
  // the cookie is missing (expired / already used link) we surface the
  // problem up front instead of on submit.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const supabase = createClient()
      const { data } = await supabase.auth.getUser()
      if (cancelled) return
      if (!data.user) {
        setError(
          'Your invite link is no longer valid. Ask your program admin to resend it.',
        )
        setBootstrapped(true)
        return
      }
      const meta = (data.user.user_metadata ?? {}) as { full_name?: string }
      const first = meta.full_name?.trim().split(/\s+/)[0] ?? null
      setFirstName(first)
      setEmail(data.user.email ?? null)
      setBootstrapped(true)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setIsLoading(true)
    const supabase = createClient()

    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      router.push('/dashboard')
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to set password')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader className="space-y-2">
            <CardTitle className="font-serif text-2xl">
              {firstName ? `Welcome, ${firstName}` : 'Welcome to Wisdom At Work'}
            </CardTitle>
            <CardDescription>
              {email ? (
                <>
                  Set a password for <span className="font-medium">{email}</span> to finish
                  activating your account.
                </>
              ) : (
                'Set a password to finish activating your account.'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">At least 8 characters.</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirm">Confirm password</Label>
                <Input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !bootstrapped || !!error}
              >
                {isLoading ? 'Saving...' : 'Set password and continue'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
