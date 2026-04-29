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
  Bell,
  BookOpen,
  MessageCircle,
  Trophy,
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
    id: 'whats-new',
    slug: 'whats-new',
    label: "What's New?",
    description:
      'Announcements, program updates, and newly added resources from the team.',
    icon: Bell,
    postKinds: ['announcement'],
    writeKind: 'announcement',
    staffOnly: true,
    emptyTitle: 'No announcements yet',
    emptyCopy: 'Program updates from the team will be posted here.',
    composerTitlePlaceholder: 'New cohort cohort kickoff…',
    composerBodyPlaceholder: 'What should the community know?',
    composerCta: 'Post announcement',
  },
  {
    id: 'reflections',
    slug: 'reflections',
    label: 'Fellow Reflections',
    description:
      'Participant stories, examples from practice, and shared insights from the work.',
    icon: BookOpen,
    // Include legacy `story` rows so existing content surfaces here.
    postKinds: ['reflection', 'story'],
    writeKind: 'reflection',
    staffOnly: false,
    emptyTitle: 'No reflections yet',
    emptyCopy:
      'Share what you are noticing, learning, or rethinking - others are listening.',
    composerTitlePlaceholder: 'A moment from this week…',
    composerBodyPlaceholder:
      'What are you sitting with? What did this week teach you?',
    composerCta: 'Share reflection',
  },
  {
    id: 'wins',
    slug: 'wins',
    label: 'Wins & Progress',
    description:
      'Celebrate how schools are applying the framework - small wins count.',
    icon: Trophy,
    postKinds: ['win'],
    writeKind: 'win',
    staffOnly: false,
    emptyTitle: 'No wins shared yet',
    emptyCopy:
      'Be the first to share a moment of progress - momentum starts here.',
    composerTitlePlaceholder: 'A win worth sharing…',
    composerBodyPlaceholder: 'What worked? Who was it for? What changed?',
    composerCta: 'Share a win',
  },
  {
    id: 'ask',
    slug: 'ask',
    label: 'Ask the Community',
    description:
      'Questions, challenges, and peer support from fellows and facilitators.',
    icon: MessageCircle,
    postKinds: ['question'],
    writeKind: 'question',
    staffOnly: false,
    emptyTitle: 'No questions yet',
    emptyCopy:
      'Stuck on something? Ask the community - someone has been there.',
    composerTitlePlaceholder: 'How are you handling…',
    composerBodyPlaceholder:
      'Give a little context so others can answer well.',
    composerCta: 'Ask the community',
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
