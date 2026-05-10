'use client'

import { useRef, useState, useTransition } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'
import { Upload, Users } from 'lucide-react'
import { ROLE_LABELS, type Role } from '@/lib/roles'
import { COHORTS } from '@/lib/cohorts'
import { bulkInviteAction, type BulkInviteSummary } from './actions'

type Props = {
  cohorts: { id: string; name: string }[]
}

const NONE_TEAM = '__none__'
const NONE_COHORT = '__none_cohort__'

type Mode = 'paste' | 'csv'

export function BulkInviteDialog({ cohorts }: Props) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('paste')
  const [pastedText, setPastedText] = useState('')
  const [csvText, setCsvText] = useState('')
  const [csvFileName, setCsvFileName] = useState<string | null>(null)
  const [role, setRole] = useState<Role>('fellow')
  const [schoolTeamId, setSchoolTeamId] = useState<string>(NONE_TEAM)
  const [cohortLetter, setCohortLetter] = useState<string>(NONE_COHORT)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<BulkInviteSummary | null>(null)
  const [pending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isFellow = role === 'fellow'

  function reset() {
    setMode('paste')
    setPastedText('')
    setCsvText('')
    setCsvFileName(null)
    setRole('fellow')
    setSchoolTeamId(NONE_TEAM)
    setCohortLetter(NONE_COHORT)
    setError(null)
    setSummary(null)
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    setCsvText(text)
    setCsvFileName(file.name)
  }

  function handleSubmit() {
    setError(null)
    setSummary(null)
    const text = mode === 'csv' ? csvText : pastedText
    if (!text.trim()) {
      setError(
        mode === 'csv'
          ? 'Choose a CSV file first'
          : 'Paste at least one email address',
      )
      return
    }
    const fd = new FormData()
    fd.set('source', mode)
    fd.set('text', text)
    fd.set('role', role)
    fd.set('cohortId', schoolTeamId === NONE_TEAM ? '' : schoolTeamId)
    fd.set(
      'cohortLetter',
      isFellow && cohortLetter !== NONE_COHORT ? cohortLetter : '',
    )
    startTransition(async () => {
      const result = await bulkInviteAction(fd)
      if (!result.ok) {
        setError(result.message)
        return
      }
      setSummary(result)
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Users className="h-4 w-4" />
          Bulk invite
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk invite users</DialogTitle>
          <DialogDescription>
            Send branded invitations to many people at once. Each recipient gets a
            personalized magic link to set their password.
          </DialogDescription>
        </DialogHeader>

        {!summary ? (
          <div className="space-y-5">
            <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="paste">Paste a list</TabsTrigger>
                <TabsTrigger value="csv">Upload a CSV</TabsTrigger>
              </TabsList>

              <TabsContent value="paste" className="space-y-2 pt-3">
                <FieldLabel htmlFor="bulk-paste">Email list</FieldLabel>
                <Textarea
                  id="bulk-paste"
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder={
                    'jane@example.com\nJohn Doe <john@example.com>\nada@example.com,Ada Lovelace,Principal'
                  }
                  rows={8}
                  className="font-mono text-xs"
                  spellCheck={false}
                />
                <FieldDescription>
                  One per line. Accepts <span className="font-mono">email</span>,{' '}
                  <span className="font-mono">Name &lt;email&gt;</span>, or{' '}
                  <span className="font-mono">email,Name,Title</span>.
                </FieldDescription>
              </TabsContent>

              <TabsContent value="csv" className="space-y-3 pt-3">
                <div className="flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4" />
                    Choose CSV
                  </Button>
                  {csvFileName ? (
                    <span className="text-sm text-muted-foreground">{csvFileName}</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      No file chosen
                    </span>
                  )}
                </div>
                <FieldDescription>
                  CSV with a header row. Required column:{' '}
                  <span className="font-mono">email</span>. Optional:{' '}
                  <span className="font-mono">full_name</span> (or{' '}
                  <span className="font-mono">name</span>),{' '}
                  <span className="font-mono">title</span>,{' '}
                  <span className="font-mono">cohort</span>.
                </FieldDescription>
              </TabsContent>
            </Tabs>

            <FieldGroup>
              <Field>
                <FieldLabel>Default role</FieldLabel>
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
              </Field>

              <Field>
                <FieldLabel>Default school team (optional)</FieldLabel>
                <Select value={schoolTeamId} onValueChange={setSchoolTeamId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_TEAM}>No team</SelectItem>
                    {cohorts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {isFellow ? (
                <Field>
                  <FieldLabel>Default cohort (optional)</FieldLabel>
                  <Select value={cohortLetter} onValueChange={setCohortLetter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_COHORT}>No cohort</SelectItem>
                      {COHORTS.map((c) => (
                        <SelectItem key={c} value={c}>
                          Cohort {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldDescription>
                    Per-row <span className="font-mono">cohort</span> values from a
                    CSV override this default.
                  </FieldDescription>
                </Field>
              ) : null}
            </FieldGroup>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
        ) : (
          <BulkSummary summary={summary} onAgain={() => setSummary(null)} />
        )}

        <DialogFooter className="mt-2">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            {summary ? 'Close' : 'Cancel'}
          </Button>
          {!summary && (
            <Button type="button" onClick={handleSubmit} disabled={pending}>
              {pending && <Spinner className="h-4 w-4" />}
              Send invites
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function BulkSummary({
  summary,
  onAgain,
}: {
  summary: BulkInviteSummary
  onAgain: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge variant="secondary">Total: {summary.total}</Badge>
        <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
          Invited: {summary.invited}
        </Badge>
        {summary.failed > 0 && (
          <Badge variant="destructive">Failed: {summary.failed}</Badge>
        )}
      </div>
      <div className="max-h-72 overflow-auto rounded-md border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {summary.results.map((r, i) => (
              <tr key={`${r.email}-${i}`}>
                <td className="px-3 py-2 font-mono text-xs">{r.email}</td>
                <td className="px-3 py-2">
                  {r.status === 'invited' ? (
                    <span className="text-emerald-600">invited</span>
                  ) : (
                    <span className="text-destructive">failed</span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {r.message ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <Button variant="outline" onClick={onAgain}>
          Invite more
        </Button>
      </div>
    </div>
  )
}
