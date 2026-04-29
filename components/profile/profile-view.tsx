'use client'

import { Mail } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  type DirectoryProfile,
  initialsFor,
  roleLabelFor,
} from '@/lib/types/profile'

/**
 * Full-profile body. Designed to be rendered inside any container
 * (Dialog, dedicated page, side sheet) - it stops at flex layout
 * and never opens its own portal. The modal wrapper is exported
 * separately as {@link ProfileModal}.
 *
 * Sections, in order:
 *  - Large avatar + name + role/cohort badges
 *  - Title + team (school) row
 *  - Bio paragraph (whitespace-pre-wrap so newlines survive)
 *  - Contact email link, only when present
 */
interface ProfileViewProps {
  profile: DirectoryProfile
  /**
   * Whether to render the "Cohort A/B/C" chip. Mirrors MemberCard
   * - admin-only by default. Server passes the value derived from
   * `user.role === 'admin'` so fellows never see staging metadata.
   */
  showCohort?: boolean
}

export function ProfileView({ profile, showCohort = false }: ProfileViewProps) {
  const name = profile.full_name?.trim() || profile.email || 'Unnamed member'
  const initials = initialsFor(profile.full_name, profile.email)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:gap-5 sm:text-left">
        <Avatar className="h-24 w-24 shrink-0">
          {profile.avatar_url ? (
            <AvatarImage src={profile.avatar_url} alt="" />
          ) : null}
          <AvatarFallback className="text-xl font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <h2 className="font-serif text-2xl text-foreground text-balance">
            {name}
          </h2>
          {profile.title && (
            <p className="mt-1 text-sm text-muted-foreground">
              {profile.title}
            </p>
          )}
          {profile.school_name && (
            <p className="text-sm text-muted-foreground">
              {profile.school_name}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 sm:justify-start">
            <Badge variant="secondary" className="text-xs">
              {roleLabelFor(profile.role)}
            </Badge>
            {/* Cohort chip is admin-only - same rule as MemberCard. */}
            {showCohort && profile.cohort && (
              <Badge variant="outline" className="text-xs">
                Cohort {profile.cohort}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {profile.bio?.trim() && (
        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            About
          </h3>
          <p className="whitespace-pre-wrap text-pretty text-sm leading-relaxed text-foreground">
            {profile.bio}
          </p>
        </section>
      )}

      {profile.email && (
        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Contact
          </h3>
          <a
            href={`mailto:${profile.email}`}
            className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <Mail className="h-4 w-4" aria-hidden="true" />
            {profile.email}
          </a>
        </section>
      )}
    </div>
  )
}

interface ProfileModalProps {
  /** When non-null the modal is open and renders that profile. */
  profile: DirectoryProfile | null
  /** Called when the dialog wants to close - parent clears state. */
  onOpenChange: (open: boolean) => void
  /** Forwarded to ProfileView - admin-only cohort chip. */
  showCohort?: boolean
}

/**
 * Convenience wrapper that pairs ProfileView with a shadcn Dialog.
 * Keeps each call site to a one-liner: pass the currently-selected
 * profile (or null) and a setter that toggles it.
 */
export function ProfileModal({
  profile,
  onOpenChange,
  showCohort = false,
}: ProfileModalProps) {
  return (
    <Dialog open={!!profile} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="sr-only">
          <DialogTitle>
            {profile?.full_name?.trim() || profile?.email || 'Profile'}
          </DialogTitle>
          <DialogDescription>Member profile details</DialogDescription>
        </DialogHeader>
        {profile && (
          <ProfileView profile={profile} showCohort={showCohort} />
        )}
      </DialogContent>
    </Dialog>
  )
}
