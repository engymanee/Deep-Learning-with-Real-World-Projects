/**
 * Single source of truth for the Community sidebar sections.
 *
 * Each section maps to:
 *   - A URL slug under /community/<slug>
 *   - A `community_posts.kind` value (or set of values) used to scope
 *     the feed query for that section. The exception is `bios`, which
 *     is a directory of profiles, not a post feed.
 *
 * If a section ships posts, it can be staff-only. Right now only
 * announcements (What's New?) are staff-only - everyone can post
 * reflections, wins, and questions.
 */
import {
  BookOpen,
  Building2,
  Users,
  type LucideIcon,
} from 'lucide-react'

export interface CommunitySection {
  /** Stable id used for the counts map and mobile rail. */
  id: string
  /** URL slug; the route is /community/<slug>. */
  slug: string
  /** Sidebar label. */
  label: string
  /** One-liner used on the section landing page. */
  description: string
  /** Lucide icon for the sidebar / mobile rail. */
  icon: LucideIcon
  /**
   * Which `community_posts.kind` values feed this section. Multiple
   * values are summed (e.g. `reflection` + legacy `story`). `null`
   * means the section isn't a post feed (bios).
   */
  postKinds: string[] | null
  /**
   * Canonical kind to write into new rows. Defaults to the first
   * value in `postKinds`. `null` -> no composer.
   */
  writeKind: string | null
  /** When true, only admins / facilitators can compose. */
  staffOnly: boolean
  /** Empty-state heading shown when the feed is empty. */
  emptyTitle: string
  /** Empty-state body. */
  emptyCopy: string
  /** Composer placeholder copy (title field). */
  composerTitlePlaceholder: string
  /** Composer placeholder copy (body field). */
  composerBodyPlaceholder: string
  /** CTA shown on the "New post" button. */
  composerCta: string
}

export const COMMUNITY_SECTIONS: CommunitySection[] = [
  {
    id: 'bios',
    slug: 'bios',
    label: 'Fellows Bios',
    description:
      'Meet every fellow and faculty member across the program - search, filter by team, and open a full profile.',
    icon: Users,
    postKinds: null,
    writeKind: null,
    staffOnly: false,
    emptyTitle: 'No fellows yet',
    emptyCopy: 'Profiles will appear here once members are onboarded.',
    composerTitlePlaceholder: '',
    composerBodyPlaceholder: '',
    composerCta: '',
  },
  {
    id: 'schools',
    slug: 'schools',
    label: 'School Profile',
    description:
      'Learn about partner schools and their leadership teams.',
    icon: Building2,
    postKinds: null,
    writeKind: null,
    staffOnly: false,
    emptyTitle: 'No schools yet',
    emptyCopy: 'Schools will appear here once they are added.',
    composerTitlePlaceholder: '',
    composerBodyPlaceholder: '',
    composerCta: '',
  },
  {
    id: 'reflections',
    slug: 'reflections',
    label: 'Fellow Reflections',
    description:
      'Reflections from programme labs and content - shared with peers, with comments to learn from each other.',
    icon: BookOpen,
    // Reflections are now driven entirely by `user_content_reflections`
    // (see /community/reflections page). The section no longer has a
    // free-form post composer; legacy `community_posts` rows of kind
    // `reflection`/`story` are still readable via /community/stories
    // but no longer surface here. `postKinds: null` keeps loadSection
    // from being called for this slug.
    postKinds: null,
    writeKind: null,
    staffOnly: false,
    emptyTitle: 'No reflections yet',
    emptyCopy:
      'Reflections will appear here as fellows respond to lab prompts and content. Open a lab in your phase to share one.',
    composerTitlePlaceholder: '',
    composerBodyPlaceholder: '',
    composerCta: '',
  },
]

/** Look up a section by its `slug`. Returns null if unknown. */
export function getSectionBySlug(slug: string): CommunitySection | null {
  return COMMUNITY_SECTIONS.find((s) => s.slug === slug) ?? null
}

/** Look up the slug a `kind` belongs to (used for revalidation). */
export function slugForKind(kind: string): string | null {
  const match = COMMUNITY_SECTIONS.find((s) =>
    s.postKinds ? s.postKinds.includes(kind) : false,
  )
  return match?.slug ?? null
}

/** Allowed kinds clients are permitted to write directly. */
export const WRITABLE_KINDS = COMMUNITY_SECTIONS.filter(
  (s) => s.writeKind !== null,
).map((s) => s.writeKind as string)
