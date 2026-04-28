/**
 * Curriculum content classification.
 *
 * The curriculum is a flat two-level structure:
 *   Phase (table: `years`) -> Content item (table: `labs`)
 *
 * Each content item belongs to exactly one Category that determines
 * where it shows up inside its phase, and exactly one Resource Type
 * that determines how the fellow consumes it.
 */

export const CONTENT_CATEGORIES = [
  'before_lab',
  'during_lab',
  'after_lab',
  'general_resources',
  'wisdom_coaching',
  'community_of_practice',
] as const

export type ContentCategory = (typeof CONTENT_CATEGORIES)[number]

export const CONTENT_CATEGORY_LABELS: Record<ContentCategory, string> = {
  before_lab: 'Before the Lab',
  during_lab: 'During the Lab',
  after_lab: 'After the Lab',
  general_resources: 'General Resources',
  wisdom_coaching: 'Wisdom Coaching',
  community_of_practice: 'Community of Practice',
}

export const CONTENT_CATEGORY_DESCRIPTIONS: Record<ContentCategory, string> = {
  before_lab: 'Prep work and pre-reading fellows complete before the live lab.',
  during_lab:
    'Slides, worksheets, and protocols used live during the lab session.',
  after_lab:
    'Reflection prompts, post-work, and surveys assigned after the lab.',
  general_resources: 'Standalone references that support the phase as a whole.',
  wisdom_coaching: 'Coaching prompts, companion guides, and 1:1 support.',
  community_of_practice:
    'Discussion threads, peer-share assignments, and community work.',
}

export function isContentCategory(v: unknown): v is ContentCategory {
  return typeof v === 'string' && (CONTENT_CATEGORIES as readonly string[]).includes(v)
}

export const CONTENT_RESOURCE_TYPES = [
  'reading',
  'video',
  'slide_deck',
  'pdf',
  'worksheet',
  'reflection_prompt',
  'survey',
  'external_link',
  'protocol',
  'companion_guide',
  'assignment',
  'other',
] as const

export type ContentResourceType = (typeof CONTENT_RESOURCE_TYPES)[number]

export const CONTENT_RESOURCE_TYPE_LABELS: Record<ContentResourceType, string> = {
  reading: 'Reading',
  video: 'Video',
  slide_deck: 'Slide Deck',
  pdf: 'PDF',
  worksheet: 'Worksheet',
  reflection_prompt: 'Reflection Prompt',
  survey: 'Survey',
  external_link: 'External Link',
  protocol: 'Protocol',
  companion_guide: 'Companion Guide',
  assignment: 'Assignment',
  other: 'Other',
}

export function isContentResourceType(v: unknown): v is ContentResourceType {
  return (
    typeof v === 'string' && (CONTENT_RESOURCE_TYPES as readonly string[]).includes(v)
  )
}

/**
 * Resolve the effective cohort gating for a content item, given its
 * own (possibly null) cohort list and the phase's cohort list.
 *
 *  - item.cohorts === null            -> inherit phase cohorts
 *  - item.cohorts === []              -> locked (no fellow can see it)
 *  - item.cohorts === ['A', ...]      -> override (only listed cohorts)
 *
 * The result feeds straight into `fellowCanAccess()` from `lib/cohorts`.
 */
export function effectiveCohorts(
  itemCohorts: readonly string[] | null | undefined,
  phaseCohorts: readonly string[] | null | undefined,
): readonly string[] {
  if (itemCohorts === null || itemCohorts === undefined) {
    return phaseCohorts ?? []
  }
  return itemCohorts
}

/**
 * Categories rendered in the fellow's phase view, in the canonical
 * order. Useful for grouping content items consistently anywhere
 * fellows or admins browse the curriculum.
 */
export const CATEGORY_DISPLAY_ORDER: readonly ContentCategory[] = [
  'before_lab',
  'during_lab',
  'after_lab',
  'general_resources',
  'wisdom_coaching',
  'community_of_practice',
]
