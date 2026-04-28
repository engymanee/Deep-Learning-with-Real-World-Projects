'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  type DirectoryProfile,
  initialsFor,
  roleLabelFor,
} from '@/lib/types/profile'
import { cn } from '@/lib/utils'

interface Props {
  profile: DirectoryProfile
  /**
   * Card surface variant:
   *  - 'compact'  - photo on the left, two-line right column. Used
   *    in the Team grid and the Community Fellow Bios grid.
   *  - 'detailed' - same layout, plus a 2-line bio excerpt and the
   *    school name on its own row. Used by Community when a richer
   *    card is helpful.
   */
  variant?: 'compact' | 'detailed'
  /** Optional click handler - when provided the card becomes a button. */
  onSelect?: (profile: DirectoryProfile) => void
}

/**
 * MemberCard renders a single directory entry. It's used in two
 * places (Team grid and Community Fellow Bios grid) and is the
 * trigger for the modal {@link ProfileView}.
 *
 * Design notes:
 *  - The whole card is one focusable element when interactive, so
 *    keyboard nav matches click affordance.
 *  - Cohort and role badges live on a single chip row beneath the
 *    title to avoid stacking badges vertically.
 *  - Bio excerpt uses `line-clamp-2` so cards stay equal height.
 */
export function MemberCard({ profile, variant = 'compact', onSelect }: Props) {
  const name = profile.full_name?.trim() || profile.email || 'Unnamed member'
  const initials = initialsFor(profile.full_name, profile.email)
  const interactive = !!onSelect
  const showBio = variant === 'detailed' && !!profile.bio?.trim()

  const Tag = interactive ? 'button' : 'div'

  return (
    <Tag
      type={interactive ? 'button' : undefined}
      onClick={interactive ? () => onSelect?.(profile) : undefined}
      className={cn(
        'group flex w-full items-start gap-3 rounded-md border border-border bg-card p-4 text-left transition-colors',
        interactive &&
          'hover:border-primary/40 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
      aria-label={interactive ? `Open profile for ${name}` : undefined}
    >
      <Avatar className="h-12 w-12 shrink-0">
        {profile.avatar_url ? (
          <AvatarImage src={profile.avatar_url} alt="" />
        ) : null}
        <AvatarFallback className="text-sm font-medium">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{name}</p>
        {profile.title && (
          <p className="truncate text-xs text-muted-foreground">
            {profile.title}
          </p>
        )}
        {profile.school_name && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {profile.school_name}
          </p>
        )}

        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="text-[10px]">
            {roleLabelFor(profile.role)}
          </Badge>
          {profile.cohort && (
            <Badge variant="outline" className="text-[10px]">
              Cohort {profile.cohort}
            </Badge>
          )}
        </div>

        {showBio && (
          <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
            {profile.bio}
          </p>
        )}
      </div>
    </Tag>
  )
}
