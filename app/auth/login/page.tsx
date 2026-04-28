'use client'

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
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { KeyRound, Mail } from 'lucide-react'

type Method = 'password' | 'code'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // Default to "/" so the root page can redirect by role (admins land
  // on /admin, fellows on /dashboard) instead of hard-coding /dashboard
  // for every account type.
  const next = searchParams.get('next') ?? '/'

  const [method, setMethod] = useState<Method>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  function switchMethod(next: Method) {
    setMethod(next)
    setError(null)
    setCodeSentTo(null)
  }

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      // `router.replace` (instead of `push`) keeps /auth/login out of
      // browser history. We intentionally skip a follow-up
      // `router.refresh()` because the navigation itself triggers a
      // fresh server render of the destination - calling refresh on top
      // double-renders and adds noticeable click-to-content latency.
      router.replace(next.startsWith('/') ? next : '/')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to sign in')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCodeSend(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setCodeSentTo(null)

    if (!email) {
      setError('Enter your program email to receive a login code.')
      return
    }

    setIsLoading(true)
    try {
      const supabase = createClient()
      const origin =
        typeof window !== 'undefined' ? window.location.origin : ''
      const redirectTo = origin
        ? `${origin}/auth/callback?next=${encodeURIComponent(
            next.startsWith('/') ? next : '/',
          )}`
        : undefined

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          // Don't auto-create accounts - the portal is invite-only. If
          // the email isn't already registered Supabase will return an
          // error we surface below.
          shouldCreateUser: false,
          emailRedirectTo: redirectTo,
        },
      })
      if (error) throw error
      setCodeSentTo(email)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to send login code')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="space-y-2">
        <CardTitle className="font-serif text-2xl text-center">
          Wisdom At Work
        </CardTitle>
        <CardDescription className="text-center">
          Sign in to the Fellows Portal with your program email.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <MethodPicker method={method} onChange={switchMethod} disabled={isLoading} />

        {method === 'password' ? (
          <form onSubmit={handlePasswordLogin} className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="name@school.edu"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleCodeSend} className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email-code">Email</Label>
              <Input
                id="email-code"
                type="email"
                autoComplete="email"
                placeholder="name@school.edu"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                We&apos;ll email you a one-time link. Click it to sign in &mdash; no
                password required.
              </p>
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            {codeSentTo && !error && (
              <p
                role="status"
                className="rounded-md border border-border bg-muted/40 p-3 text-sm text-foreground"
              >
                Check{' '}
                <span className="font-medium">{codeSentTo}</span> for a login link. You
                can close this tab &mdash; opening the link will sign you in.
              </p>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Sending code...' : codeSentTo ? 'Resend login code' : 'Email me a login code'}
            </Button>
          </form>
        )}

        <p className="text-center text-xs text-muted-foreground">
          The Fellows Portal is invite-only. If you need access, contact the WaW team:{' '}
          <a
            href="mailto:waw@abigailadamsinstitute.org"
            className="underline underline-offset-2"
          >
            waw@abigailadamsinstitute.org
          </a>
        </p>
      </CardContent>
    </Card>
  )
}

function MethodPicker({
  method,
  onChange,
  disabled,
}: {
  method: Method
  onChange: (m: Method) => void
  disabled?: boolean
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Sign-in method"
      className="grid grid-cols-2 gap-2"
    >
      <MethodTab
        icon={<KeyRound className="h-4 w-4" />}
        label="Password"
        selected={method === 'password'}
        onSelect={() => onChange('password')}
        disabled={disabled}
      />
      <MethodTab
        icon={<Mail className="h-4 w-4" />}
        label="Email code"
        selected={method === 'code'}
        onSelect={() => onChange('code')}
        disabled={disabled}
      />
    </div>
  )
}

function MethodTab({
  icon,
  label,
  selected,
  onSelect,
  disabled,
}: {
  icon: React.ReactNode
  label: string
  selected: boolean
  onSelect: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      disabled={disabled}
      className={[
        'flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        selected
          ? 'border-primary bg-primary/5 text-foreground'
          : 'border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground',
        disabled ? 'cursor-not-allowed opacity-60' : '',
      ].join(' ')}
    >
      {icon}
      {label}
    </button>
  )
}

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
