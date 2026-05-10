'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { EmailOtpType } from '@supabase/supabase-js'
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
import { KeyRound, Mail } from 'lucide-react'
import { activateWithPasswordAction } from './actions'
import { requestSignInCodeAction } from '../login/actions'

type Method = 'password' | 'code'

/**
 * The activation page is reached from the link inside the invitation
 * email:
 *
 *   /auth/activate?token_hash=...&type=invite&email=...&next=/
 *
 * The link itself does not authenticate the recipient. Instead, they
 * pick how they want to finish setup:
 *
 *   1. Create a password - we verify the one-time token, set the
 *      password, and sign them in. Future logins use email + password.
 *   2. Email me a sign-in code - we ignore the activation token, issue
 *      a fresh 6-digit OTP, and bounce them to /auth/login where they
 *      enter the code. The original token expires unused.
 *
 * Either path completes email verification before granting access.
 */
function isOtpType(value: string | null): value is EmailOtpType {
  return (
    value === 'invite' ||
    value === 'magiclink' ||
    value === 'recovery' ||
    value === 'email' ||
    value === 'signup' ||
    value === 'email_change'
  )
}

function ActivateForm() {
  const router = useRouter()
  const params = useSearchParams()
  const tokenHash = params.get('token_hash') ?? ''
  const typeRaw = params.get('type')
  const type: EmailOtpType = isOtpType(typeRaw) ? typeRaw : 'invite'
  const email = (params.get('email') ?? '').trim().toLowerCase()
  const next = params.get('next') ?? '/'

  const [method, setMethod] = useState<Method>('password')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // We need at least the email to do anything useful (the code path
  // doesn't strictly need token_hash, but the password path does).
  // Surface a friendly error if the link is mangled.
  const linkLooksValid = !!email && !!tokenHash

  async function handlePasswordSubmit(e: React.FormEvent) {
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

    setIsSubmitting(true)
    try {
      const result = await activateWithPasswordAction({
        tokenHash,
        type,
        password,
      })
      if (!result.ok) throw new Error(result.error)
      // Send through `next` (defaults to "/") so the root page picks
      // /admin or /dashboard based on role.
      router.replace(next.startsWith('/') ? next : '/')
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not activate account.')
      setIsSubmitting(false)
    }
  }

  async function handleSendCode() {
    setError(null)
    if (!email) {
      setError('This activation link is missing an email address. Ask your admin to resend.')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await requestSignInCodeAction(email)
      if (!result.ok) throw new Error(result.error)

      // Hand off to the regular login page on the verify-code step,
      // pre-filled with email + invite framing. The fresh code we
      // just stored in email_login_codes is verified server-side by
      // verifyEmailLoginCodeAction.
      const qs = new URLSearchParams({
        from: 'invite',
        email,
        next: next.startsWith('/') ? next : '/',
      })
      router.replace(`/auth/login?${qs.toString()}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not send sign-in code.')
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader className="space-y-2">
        <CardTitle className="font-serif text-2xl">Activate your account</CardTitle>
        <CardDescription>
          {email ? (
            <>
              You&apos;re activating{' '}
              <span className="font-medium text-foreground">{email}</span>. Choose how
              you&apos;d like to sign in.
            </>
          ) : (
            "Choose how you'd like to sign in to the Wisdom At Work portal."
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        {!linkLooksValid && (
          <p
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          >
            This activation link is missing or malformed. Ask your program admin to
            resend your invitation.
          </p>
        )}

        <MethodPicker
          method={method}
          onChange={(m) => {
            setMethod(m)
            setError(null)
          }}
          disabled={isSubmitting}
        />

        {method === 'password' ? (
          <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="password">Create a password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
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
                disabled={isSubmitting}
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
              disabled={!linkLooksValid || isSubmitting}
            >
              {isSubmitting ? 'Activating...' : 'Set password and sign in'}
            </Button>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="rounded-md border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
              <p className="text-foreground">No password needed.</p>
              <p className="mt-1">
                We&apos;ll email a 6-digit code to{' '}
                <span className="font-medium text-foreground">
                  {email || 'your invited address'}
                </span>
                . Enter it on the next screen to finish activating your account.
                Future logins also use a one-time code.
              </p>
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button
              type="button"
              className="w-full"
              onClick={handleSendCode}
              disabled={!email || isSubmitting}
            >
              {isSubmitting ? 'Sending code...' : 'Email me a sign-in code'}
            </Button>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Need help? Contact{' '}
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
      aria-label="Activation method"
      className="grid grid-cols-1 gap-2 sm:grid-cols-2"
    >
      <MethodCard
        icon={<KeyRound className="h-4 w-4" />}
        label="Create a password"
        description="Sign in with email + password going forward."
        selected={method === 'password'}
        onSelect={() => onChange('password')}
        disabled={disabled}
      />
      <MethodCard
        icon={<Mail className="h-4 w-4" />}
        label="Email me a sign-in code"
        description="We email a 6-digit code each time you sign in."
        selected={method === 'code'}
        onSelect={() => onChange('code')}
        disabled={disabled}
      />
    </div>
  )
}

function MethodCard({
  icon,
  label,
  description,
  selected,
  onSelect,
  disabled,
}: {
  icon: React.ReactNode
  label: string
  description: string
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
        'flex flex-col gap-1 rounded-md border p-3 text-left transition',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        selected
          ? 'border-primary bg-primary/5'
          : 'border-border bg-card hover:border-foreground/30',
        disabled ? 'cursor-not-allowed opacity-60' : '',
      ].join(' ')}
    >
      <span className="flex items-center gap-2 text-sm font-medium text-foreground">
        {icon}
        {label}
      </span>
      <span className="text-xs text-muted-foreground">{description}</span>
    </button>
  )
}

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md">
        <Suspense fallback={null}>
          <ActivateForm />
        </Suspense>
      </div>
    </div>
  )
}
