/**
 * Ask category catalogue.
 *
 * Categories are stored as a free-text column on `community_posts`
 * with a CHECK constraint (see migration 049). Centralising the
 * catalogue here keeps the composer dropdown, the filter chips and
 * the server-side validator in lock-step. Add new entries here and
 * extend the migration's CHECK constraint to expand the list.
 */
export type AskCategory =
  | 'general'
  | 'instructional'
  | 'school_team'
  | 'waw'

export interface AskCategoryDef {
  /** Stored value - matches the DB CHECK constraint. */
  value: AskCategory
  /** Short label for chips/dropdowns. */
  label: string
  /** Helper text for the composer. */
  description: string
}

export const ASK_CATEGORIES: readonly AskCategoryDef[] = [
  {
    value: 'general',
    label: 'General',
    description: 'Anything else - logistics, tech, fellowship questions.',
  },
  {
    value: 'instructional',
    label: 'Instructional',
    description: 'Classroom moves, content design, student-facing practice.',
  },
  {
    value: 'school_team',
    label: 'School team',
    description: 'Coaching teams, master schedules, school-level rollouts.',
  },
  {
    value: 'waw',
    label: 'WAW',
    description: '"What about when…" - edge cases and tough scenarios.',
  },
] as const

export const ASK_CATEGORY_VALUES = ASK_CATEGORIES.map((c) => c.value)

export function askCategoryLabel(value: string | null | undefined): string {
  if (!value) return 'Ask'
  const match = ASK_CATEGORIES.find((c) => c.value === value)
  return match?.label ?? value
}

/** Lifecycle states for an ask. NULL means it isn't an ask. */
export type AskStatus = 'open' | 'answered' | 'closed'

export const ASK_STATUS_LABEL: Record<AskStatus, string> = {
  open: 'Open',
  answered: 'Answered',
  closed: 'Closed',
}
