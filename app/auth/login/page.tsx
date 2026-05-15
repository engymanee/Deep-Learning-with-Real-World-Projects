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
import {
  requestSignInCodeAction,
  verifyEmailLoginCodeAction,
  requestPasswordSetupAction,
} from './actions'

type Method = 'password' | 'code'
type CodeStep = 'request' | 'verify'

/**
 * The login page supports a deep link from the invitation email's
 * "Email me a code" branch:
 *
 *   /auth/login?email=fellow@school.edu&from=invite&next=/
 *
 * When `from=invite` is present and the URL pre-fills an email, we
 * skip the email-input step and land the user straight on the
 * verify-code form. The 6-digit code itself is owned by our own
 * `email_login_codes` table (see lib/auth/email-login-code.ts) and is
 * verified by the `verifyEmailLoginCodeAction` server action - so the
 * client never has to know about Supabase OTP types.
 */

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // Default to "/" so the root page can redirect by role (admins land
  // on /admin, fellows on /dashboard) instead of hard-coding /dashboard
  // for every account type.
  const next = searchParams.get('next') ?? '/'
  const fromInvite = searchParams.get('from') === 'invite'
  const presetEmail = searchParams.get('email') ?? ''

  const [method, setMethod] = useState<Method>(fromInvite ? 'code' : 'password')
  const [email, setEmail] = useState(presetEmail)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [codeSentTo, setCodeSentTo] = useState<string | null>(
    fromInvite && presetEmail ? presetEmail : null,
  )
  const [codeStep, setCodeStep] = useState<CodeStep>(
    fromInvite && presetEmail ? 'verify' : 'request',
  )
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // "Set or reset password" inline panel. We render this in place of
  // the password/code forms when the user clicks the entry link, so
  // they never leave the login card. Outcomes: 'idle' (default form),
  // 'form' (collecting email), 'sent' (confirmation message).
  type SetupView = 'hidden' | 'form' | 'sent'
  const [setupView, setSetupView] = useState<SetupView>('hidden')
  const [setupEmail, setSetupEmail] = useState(presetEmail)
  const [setupSentTo, setSetupSentTo] = useState<string | null>(null)
  const [setupError, setSetupError] = useState<string | null>(null)
  const [setupLoading, setSetupLoading] = useState(false)

  function switchMethod(next: Method) {
    setMethod(next)
    setError(null)
    setCodeSentTo(null)
    setCodeStep('request')
    setCode('')
    // Switching method also collapses any open setup panel so the
    // user gets a clean form for the new method.
    setSetupView('hidden')
    setSetupError(null)
  }

  function openSetup() {
    setSetupView('form')
    // Seed the setup field from whichever email the user already
    // typed (password tab or code tab) so they don't have to re-type.
    setSetupEmail((prev) => prev || email || presetEmail)
    setSetupError(null)
    setSetupSentTo(null)
  }

  async function handleSetupSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSetupError(null)

    const trimmed = setupEmail.trim().toLowerCase()
    if (!trimmed) {
      setSetupError('Enter your program email to continue.')
      return
    }

    setSetupLoading(true)
    try {
      // The server action returns ok=true even when the email isn't
      // registered, so we never disclose account existence. Any
      // non-ok response is a real (transient) error worth surfacing.
      const result = await requestPasswordSetupAction(trimmed)
      if (!result.ok) throw new Error(result.error)
      setSetupSentTo(result.email)
      setSetupView('sent')
    } catch (err: unknown) {
      setSetupError(
        err instanceof Error
          ? err.message
          : 'Could not send the password setup email. Try again in a moment.',
      )
    } finally {
      setSetupLoading(false)
    }
  }

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
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
      // Server action stores a fresh 6-digit code in our own
      // email_login_codes table (any prior open code for this email
      // is invalidated) and emails just the digits via Resend. No
      // Supabase session is created here - that only happens after
      // verify succeeds.
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

    const trimmed = code.replace(/\D/g, '')
    if (trimmed.length !== 6) {
      setError('Enter the 6-digit code from your email.')
      return
    }

    setIsLoading(true)
    try {
      // Server action: verifies the 6-digit code against our own
      // table, then mints a Supabase session on the response cookies.
      // If the user is completing an invitation, the action also flips
      // the invitations row to accepted.
      const result = await verifyEmailLoginCodeAction(email, trimmed, {
        fromInvite,
      })
      if (!result.ok) throw new Error(result.error)

      router.replace(next.startsWith('/') ? next : '/')
      router.refresh()
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
        {setupView !== 'hidden' ? (
          <PasswordSetupPanel
            view={setupView}
            email={setupEmail}
            sentTo={setupSentTo}
            error={setupError}
            isLoading={setupLoading}
            onEmailChange={setSetupEmail}
            onSubmit={handleSetupSubmit}
            onCancel={() => {
              setSetupView('hidden')
              setSetupError(null)
            }}
            onResend={() => {
              setSetupView('form')
              setSetupSentTo(null)
            }}
          />
        ) : (
          <>
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
            <p className="text-center text-xs text-muted-foreground">
              <button
                type="button"
                onClick={openSetup}
                className="underline underline-offset-2 hover:text-foreground"
                disabled={isLoading}
              >
                Forgot or need to set a password?
              </button>
            </p>
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
            <p className="text-center text-xs text-muted-foreground">
              <button
                type="button"
                onClick={openSetup}
                className="underline underline-offset-2 hover:text-foreground"
                disabled={isLoading}
              >
                Want a password instead? Set one up
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleCodeVerify} className="flex flex-col gap-4">
            <p
              role="status"
              className="rounded-md border border-border bg-muted/40 p-3 text-sm text-foreground"
            >
              {fromInvite ? (
                <>
                  Welcome! Enter the 6-digit code we just emailed
                  {codeSentTo ? (
                    <>
                      {' '}to{' '}
                      <span className="font-medium">{codeSentTo}</span>
                    </>
                  ) : null}{' '}
                  to finish activating your account.
                </>
              ) : (
                <>
                  We sent a 6-digit code to{' '}
                  <span className="font-medium">{codeSentTo}</span>. Enter it below
                  to finish signing in.
                </>
              )}
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
          </>
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

/**
 * Inline panel rendered inside the login card when the user clicks
 * "Forgot or need to set a password?". Two views:
 *
 *   - 'form' collects the email and dispatches the request.
 *   - 'sent' shows a generic success message. The wording is
 *     intentionally the same regardless of whether the email matched
 *     a real account, so we never disclose account existence.
 */
function PasswordSetupPanel({
  view,
  email,
  sentTo,
  error,
  isLoading,
  onEmailChange,
  onSubmit,
  onCancel,
  onResend,
}: {
  view: 'form' | 'sent'
  email: string
  sentTo: string | null
  error: string | null
  isLoading: boolean
  onEmailChange: (next: string) => void
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
  onResend: () => void
}) {
  if (view === 'sent') {
    return (
      <div className="flex flex-col gap-4">
        <div
          role="status"
          className="rounded-md border border-border bg-muted/40 p-3 text-sm text-foreground"
        >
          <p className="font-medium text-foreground">Check your inbox</p>
          <p className="mt-1 text-muted-foreground">
            If an account exists for{' '}
            <span className="font-medium text-foreground">{sentTo}</span>, we sent a
            link to set or reset its password. The link expires in 1 hour.
          </p>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <button
            type="button"
            onClick={onCancel}
            className="underline underline-offset-2 hover:text-foreground"
          >
            Back to sign in
          </button>
          <button
            type="button"
            onClick={onResend}
            className="underline underline-offset-2 hover:text-foreground"
          >
            Use a different email
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
        <p className="text-foreground">Set or reset your password</p>
        <p className="mt-1">
          Enter the email on your Wisdom At Work account and we&apos;ll send a link
          to choose a new password. After that, you can sign in with either your
          password or a one-time email code.
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="setup-email">Email</Label>
        <Input
          id="setup-email"
          type="email"
          autoComplete="email"
          placeholder="name@school.edu"
          required
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          disabled={isLoading}
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="grid gap-2">
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Sending link...' : 'Email me a setup link'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
      </div>
    </form>
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
