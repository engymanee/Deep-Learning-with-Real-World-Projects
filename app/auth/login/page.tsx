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
import { requestSignInCodeAction } from './actions'

type Method = 'password' | 'code'
type CodeStep = 'request' | 'verify'

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
  const [codeStep, setCodeStep] = useState<CodeStep>('request')
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  function switchMethod(next: Method) {
    setMethod(next)
    setError(null)
    setCodeSentTo(null)
    setCodeStep('request')
    setCode('')
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
      // Server action issues the OTP via Supabase admin and emails it
      // through Resend. Returns just-the-code, no magic link.
      const result = await requestSignInCodeAction(email)
      if (!result.ok) throw new Error(result.error)
      setCodeSentTo(result.email)
      setCodeStep('verify')
      setCode('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to send login code')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCodeVerify(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const trimmed = code.replace(/\s+/g, '')
    if (!trimmed || trimmed.length < 6) {
      setError('Enter the 6-digit code from your email.')
      return
    }

    setIsLoading(true)
    try {
      const supabase = createClient()
      // `type: 'email'` matches the 6-digit OTP issued by
      // generateLink({ type: 'magiclink' }) on the server.
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: trimmed,
        type: 'email',
      })
      if (error) throw error
      router.replace(next.startsWith('/') ? next : '/')
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'That code was invalid or has expired. Try requesting a new one.',
      )
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
        ) : codeStep === 'request' ? (
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
                We&apos;ll email you a 6-digit code. Come back to this tab and type it
                in to sign in &mdash; no password required.
              </p>
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Sending code...' : 'Email me a sign-in code'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleCodeVerify} className="flex flex-col gap-4">
            <p
              role="status"
              className="rounded-md border border-border bg-muted/40 p-3 text-sm text-foreground"
            >
              We sent a 6-digit code to{' '}
              <span className="font-medium">{codeSentTo}</span>. Enter it below to
              finish signing in.
            </p>
            <div className="grid gap-2">
              <Label htmlFor="otp-code">Sign-in code</Label>
              <Input
                id="otp-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="123456"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="text-center text-lg tracking-[0.5em] font-mono"
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Verifying...' : 'Verify and sign in'}
            </Button>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <button
                type="button"
                onClick={() => {
                  setCodeStep('request')
                  setCode('')
                  setError(null)
                }}
                className="underline underline-offset-2 hover:text-foreground"
                disabled={isLoading}
              >
                Use a different email
              </button>
              <button
                type="button"
                onClick={(ev) => {
                  setCode('')
                  handleCodeSend(ev)
                }}
                className="underline underline-offset-2 hover:text-foreground"
                disabled={isLoading}
              >
                Resend code
              </button>
            </div>
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
