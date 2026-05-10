'use client'

import { useState } from 'react'
import { CheckCircle2, Mail, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Status =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'success'; to: string; id: string | null }
  | { kind: 'error'; message: string }

export function TestEmailButton() {
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  async function handleClick() {
    setStatus({ kind: 'sending' })
    try {
      const res = await fetch('/api/admin/test-email', { method: 'POST' })
      const json = (await res.json().catch(() => null)) as
        | { ok: true; to: string; id: string | null }
        | { ok: false; error?: string }
        | null

      if (res.ok && json && json.ok) {
        setStatus({ kind: 'success', to: json.to, id: json.id })
      } else {
        const message =
          (json && !json.ok && json.error) ||
          `Request failed with status ${res.status}`
        setStatus({ kind: 'error', message })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Network error'
      setStatus({ kind: 'error', message })
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-dashed border-border bg-muted/30 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <p className="text-sm font-medium text-foreground">Email delivery test</p>
          <p className="text-xs text-muted-foreground">
            Sends a one-off test email via Resend to verify portal delivery.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={handleClick}
          disabled={status.kind === 'sending'}
        >
          <Mail className="mr-1.5 h-4 w-4" aria-hidden="true" />
          {status.kind === 'sending' ? 'Sending…' : 'Send test email'}
        </Button>
      </div>

      {status.kind === 'success' && (
        <p
          className="inline-flex items-center gap-1.5 text-xs text-success"
          role="status"
          aria-live="polite"
        >
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          Sent to {status.to}
          {status.id ? ` (id: ${status.id})` : ''}.
        </p>
      )}
      {status.kind === 'error' && (
        <p
          className="inline-flex items-center gap-1.5 text-xs text-destructive"
          role="alert"
        >
          <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
          Failed: {status.message}
        </p>
      )}
    </div>
  )
}
