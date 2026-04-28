'use client'

import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { COHORTS, type Cohort } from '@/lib/cohorts'

type Props = {
  /** Comma-separated form field name (e.g. "cohorts"). */
  name?: string
  /** Initial selected cohorts. */
  defaultValue?: readonly string[]
  /** Optional id prefix so multiple instances on a page have unique inputs. */
  idPrefix?: string
  /** Override the small explanatory copy under the checkboxes. */
  description?: string
  label?: string
}

/**
 * Reusable A / B / C cohort selector for the admin UI.
 *
 * Behavior matches the convention used app-wide:
 *  - Zero boxes checked  -> available to every cohort
 *  - Any box checked     -> restricted to those cohorts only
 *
 * The component renders one hidden input per selected cohort using
 * `name` (default "cohorts"), so server actions can read the field
 * with `formData.getAll(name)` and write the resulting array straight
 * to a Postgres `text[]` column.
 */
export function CohortAccessField({
  name = 'cohorts',
  defaultValue = [],
  idPrefix = 'cohort',
  description = 'Leave all unchecked to make this available to every fellow. Tick one or more to restrict access.',
  label = 'Cohort access',
}: Props) {
  const [selected, setSelected] = useState<Set<Cohort>>(
    () => new Set(defaultValue.filter((c): c is Cohort => COHORTS.includes(c as Cohort))),
  )

  function toggle(cohort: Cohort, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(cohort)
      else next.delete(cohort)
      return next
    })
  }

  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex flex-wrap gap-3" role="group" aria-label={label}>
        {COHORTS.map((c) => {
          const id = `${idPrefix}-${c}`
          const isChecked = selected.has(c)
          return (
            <label
              key={c}
              htmlFor={id}
              className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                isChecked
                  ? 'border-primary bg-primary/5 text-foreground'
                  : 'border-border text-muted-foreground hover:border-foreground/30'
              }`}
            >
              <Checkbox
                id={id}
                checked={isChecked}
                onCheckedChange={(v) => toggle(c, v === true)}
              />
              <span>Cohort {c}</span>
            </label>
          )
        })}
      </div>

      {/* Hidden inputs that submit with the form. One per checked cohort. */}
      {Array.from(selected).map((c) => (
        <input key={c} type="hidden" name={name} value={c} />
      ))}

      <FieldDescription>{description}</FieldDescription>
    </Field>
  )
}

/**
 * Compact read-only badge for showing which cohorts a row is gated to.
 * Returns null when there's no gating (i.e. open to all cohorts) so
 * callers can drop it inline without an extra wrapper conditional.
 */
export function CohortBadge({ cohorts }: { cohorts: readonly string[] | null | undefined }) {
  if (!cohorts || cohorts.length === 0) return null
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
      title="Visible only to listed cohorts"
    >
      <span className="sr-only">Visible to cohorts</span>
      {cohorts.join(' · ')}
    </span>
  )
}
