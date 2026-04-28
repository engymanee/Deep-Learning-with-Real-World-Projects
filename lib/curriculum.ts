/**
 * Curriculum domain model.
 *
 * The curriculum is two flat tables in the database:
 *
 *   - `years`  -> "phases"        (top-level groupings, e.g. "Year 1", "Foundations")
 *   - `labs`   -> "content items" (every fellow-facing piece of content)
 *
 * Each content item belongs to exactly one phase and one category
 * (see `CONTENT_CATEGORIES`), and has a single resource type (see
 * `RESOURCE_TYPES`) that drives icon + display behaviour. There are no
 * blocks, no nested groups, no per-content progress tracking - just
 * phase -> category -> ordered list of items.
 *
 * Cohort access works at two levels:
 *
 *   1. Phase-level (`years.cohorts`): which cohorts can see the phase
 *      at all. Empty array means the phase is unassigned and hidden
 *      from every fellow.
 *
 *   2. Content-level (`labs.cohorts`):
 *        - NULL     -> inherit from the parent phase
 *        - []       -> locked, hidden from every fellow even if the
 *                      phase itself is visible
 *        - ['A',..] -> override; only those cohorts can see the item,
 *                      and they must also be allowed by the phase
 *
 * Admins and facilitators always bypass these checks.
 */

import { fellowCanAccess, type Cohort } from '@/lib/cohorts'

// ============================================================================
// Categories
// ============================================================================

export const CONTENT_CATEGORIES = [
  {
    value: 'before_lab',
    label: 'Before Lab',
    short: 'Before',
    description: 'Preparation - readings, reflections, and context to do before the live session.',
  },
  {
    value: 'during_lab',
    label: 'During Lab',
    short: 'During',
    description: 'Materials used live in session: agenda, protocols, slides, join links.',
  },
  {
    value: 'after_lab',
    label: 'After Lab',
    short: 'After',
    description: 'Integration and follow-through: reflection prompts, surveys, follow-up practice.',
  },
  {
    value: 'general_resources',
    label: 'General Resources',
    short: 'Resources',
    description: 'Supporting reference materials available throughout this phase.',
  },
  {
    value: 'wisdom_coaching',
    label: 'Wisdom Coaching',
    short: 'Coaching',
    description: 'One-to-one coaching guidance, prompts, and companion documents.',
  },
  {
    value: 'community_of_practice',
    label: 'Community of Practice',
    short: 'Community',
    description: 'Cohort gatherings and peer-practice materials.',
  },
] as const

export type ContentCategory = (typeof CONTENT_CATEGORIES)[number]['value']
export const CONTENT_CATEGORY_VALUES = CONTENT_CATEGORIES.map((c) => c.value) as readonly ContentCategory[]

const CATEGORY_LOOKUP = new Map(CONTENT_CATEGORIES.map((c) => [c.value, c] as const))

export function getCategory(value: ContentCategory) {
  return CATEGORY_LOOKUP.get(value)!
}

export function isContentCategory(v: unknown): v is ContentCategory {
  return typeof v === 'string' && CATEGORY_LOOKUP.has(v as ContentCategory)
}

// ============================================================================
// Resource types
// ============================================================================

export const RESOURCE_TYPES = [
  { value: 'reading', label: 'Reading' },
  { value: 'video', label: 'Video' },
  { value: 'slide_deck', label: 'Slide deck' },
  { value: 'pdf', label: 'PDF' },
  { value: 'worksheet', label: 'Worksheet' },
  { value: 'reflection_prompt', label: 'Reflection prompt' },
  { value: 'survey', label: 'Survey' },
  { value: 'external_link', label: 'External link' },
  { value: 'protocol', label: 'Protocol' },
  { value: 'companion_guide', label: 'Companion guide' },
  { value: 'assignment', label: 'Assignment' },
  { value: 'other', label: 'Other' },
] as const

export type ResourceType = (typeof RESOURCE_TYPES)[number]['value']
export const RESOURCE_TYPE_VALUES = RESOURCE_TYPES.map((r) => r.value) as readonly ResourceType[]

const RESOURCE_LOOKUP = new Map(RESOURCE_TYPES.map((r) => [r.value, r] as const))

export function getResourceType(value: ResourceType) {
  return RESOURCE_LOOKUP.get(value)!
}

export function isResourceType(v: unknown): v is ResourceType {
  return typeof v === 'string' && RESOURCE_LOOKUP.has(v as ResourceType)
}

// ============================================================================
// Cohort access
// ============================================================================

/**
 * Resolve the *effective* cohort list for a content item by combining
 * its own override with the parent phase. Used purely as a derived
 * value - the database stores `null` to mean "inherit", and that's
 * what callers should write back when an admin clears the override.
 */
export function effectiveCohorts(
  itemCohorts: readonly string[] | null | undefined,
  phaseCohorts: readonly string[] | null | undefined,
): readonly string[] {
  // null  -> inherit from phase
  if (itemCohorts == null) return phaseCohorts ?? []
  // []    -> explicitly locked (no one)
  // [...] -> override; intersected with phase below in canFellowSeeContent
  return itemCohorts
}

/** Whether a fellow with `userCohort` can see a given phase. */
export function canFellowSeePhase(
  phaseCohorts: readonly string[] | null | undefined,
  userCohort: Cohort | null | undefined,
): boolean {
  return fellowCanAccess(phaseCohorts ?? null, userCohort)
}

/**
 * Whether a fellow with `userCohort` can see a given content item.
 * The content item is visible only when:
 *   - the parent phase is visible to the fellow, AND
 *   - the effective cohort list (item override OR inherited phase list)
 *     contains the fellow's cohort.
 */
export function canFellowSeeContent(
  itemCohorts: readonly string[] | null | undefined,
  phaseCohorts: readonly string[] | null | undefined,
  userCohort: Cohort | null | undefined,
): boolean {
  if (!canFellowSeePhase(phaseCohorts, userCohort)) return false
  return fellowCanAccess(effectiveCohorts(itemCohorts, phaseCohorts), userCohort)
}
