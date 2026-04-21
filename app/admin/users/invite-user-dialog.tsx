'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel, FieldDescription } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { UserPlus } from 'lucide-react'
import { inviteUserAction } from './actions'
import { ROLE_LABELS, type Role } from '@/lib/roles'

type Props = {
  cohorts: { id: string; name: string }[]
}

const NONE_COHORT = '__none__'

export function InviteUserDialog({ cohorts }: Props) {
  const [open, setOpen] = useState(false)
  const [role, setRole] = useState<Role>('fellow')
  const [cohortId, setCohortId] = useState<string>(NONE_COHORT)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  function onSubmit(formData: FormData) {
    setMessage(null)
    formData.set('role', role)
    formData.set('cohortId', cohortId === NONE_COHORT ? '' : cohortId)
    startTransition(async () => {
      const result = await inviteUserAction(formData)
      if (result.ok) {
        setMessage({ type: 'ok', text: result.message })
        setTimeout(() => {
          setOpen(false)
          setMessage(null)
        }, 1200)
      } else {
        setMessage({ type: 'err', text: result.message })
      }
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) {
          setMessage(null)
          setRole('fellow')
          setCohortId(NONE_COHORT)
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4" />
          Invite user
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite a new user</DialogTitle>
          <DialogDescription>
            They&apos;ll receive an email with a link to set their password and join the program.
          </DialogDescription>
        </DialogHeader>

        <form action={onSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="fullName">Full name</FieldLabel>
              <Input id="fullName" name="fullName" required autoComplete="off" />
            </Field>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input id="email" name="email" type="email" required autoComplete="off" />
            </Field>
            <Field>
              <FieldLabel htmlFor="title">Title (optional)</FieldLabel>
              <Input
                id="title"
                name="title"
                placeholder="e.g. Assistant Principal"
                autoComplete="off"
              />
            </Field>
            <Field>
              <FieldLabel>Role</FieldLabel>
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>
                Fellows participate in the program. Facilitators lead cohorts. Admins manage the
                whole program.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel>Cohort (optional)</FieldLabel>
              <Select value={cohortId} onValueChange={setCohortId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_COHORT}>No cohort</SelectItem>
                  {cohorts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {message && (
              <p
                className={
                  message.type === 'ok'
                    ? 'text-sm text-emerald-600'
                    : 'text-sm text-destructive'
                }
                role="status"
              >
                {message.text}
              </p>
            )}
          </FieldGroup>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner className="h-4 w-4" />}
              Send invite
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
