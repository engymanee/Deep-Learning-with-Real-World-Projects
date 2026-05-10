'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  AlertTriangle,
  Bell,
  BookOpen,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Megaphone,
  Pin,
  Trash2,
  X,
} from 'lucide-react'
import {
  dismissAllNotificationsAction,
  dismissNotificationAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from '@/lib/notifications/actions'
import type { NotificationKind } from '@/lib/notifications/types'

export interface FeedItemView {
  id: string
  kind: NotificationKind
  title: string
  body: string
  pinned: boolean
  publishedAt: string
  readAt: string | null
  author: { name: string; initials: string } | null
  ctaLabel: string | null
  ctaUrl: string | null
  content: { id: string; title: string; href: string } | null
}

interface Props {
  items: FeedItemView[]
  /** When true, render as a card with a collapse toggle (dashboard layout). */
  collapsible?: boolean
  /** Optional title override. */
  heading?: string
  /** When true, hide the "View all" footer link (e.g. on /notifications). */
  hideViewAll?: boolean
}

const KIND_META: Record<
  NotificationKind,
  { label: string; icon: typeof Bell; tone: string; accent: string }
> = {
  announcement: {
    label: 'Announcement',
    icon: Megaphone,
    tone: 'bg-secondary text-secondary-foreground',
    accent: 'border-l-secondary',
  },
  reminder: {
    label: 'Reminder',
    icon: Bell,
    tone: 'bg-primary/10 text-primary',
    accent: 'border-l-primary',
  },
  alert: {
    label: 'Alert',
    icon: AlertTriangle,
    tone: 'bg-destructive/10 text-destructive',
    accent: 'border-l-destructive',
  },
}

function useNow(intervalMs = 60_000): number | null {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

function formatRelativeTime(isoDate: string, now: number): string {
  const diffMs = new Date(isoDate).getTime() - now
  const diffMins = Math.floor(diffMs / 60_000)
  if (diffMins < 0) {
    const absMins = Math.abs(diffMins)
    if (absMins < 60) return `${absMins}m ago`
    const hours = Math.floor(absMins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }
  if (diffMins < 60) return `in ${diffMins}m`
  const hours = Math.floor(diffMins / 60)
  if (hours < 24) return `in ${hours}h`
  const days = Math.floor(hours / 24)
  return `in ${days}d`
}

export function NotificationsFeed({
  items,
  collapsible = false,
  heading = 'Notifications',
  hideViewAll = false,
}: Props) {
  const [expanded, setExpanded] = useState(true)
  const now = useNow()
  const router = useRouter()
  // Local optimistic dismissed state. The server action revalidates
  // /dashboard and /notifications, but we hide rows immediately so
  // the UI feels instant - especially on Clear all.
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())

  const visibleItems = useMemo(
    () => items.filter((i) => !dismissedIds.has(i.id)),
    [items, dismissedIds],
  )
  const unreadCount = useMemo(
    () => visibleItems.filter((i) => !i.readAt).length,
    [visibleItems],
  )

  const inner = (
    <>
      <div className="mb-6 flex items-center justify-between gap-2">
        {collapsible ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex flex-1 items-center justify-between gap-2 transition-opacity hover:opacity-75"
            aria-expanded={expanded}
          >
            <h3 className="font-serif text-lg text-primary">{heading}</h3>
            {expanded ? (
              <ChevronUp className="h-5 w-5 text-text-muted" aria-hidden />
            ) : (
              <ChevronDown className="h-5 w-5 text-text-muted" aria-hidden />
            )}
          </button>
        ) : (
          <h3 className="font-serif text-lg text-primary">{heading}</h3>
        )}
        {expanded && visibleItems.length > 0 && (
          <div className="flex items-center gap-1">
            {unreadCount > 0 && <MarkAllReadButton />}
            <ClearAllButton
              count={visibleItems.length}
              onCleared={() => {
                // Hide every currently-visible row immediately. The
                // server action revalidates the page but a local
                // optimistic update gives the user instant feedback.
                setDismissedIds(
                  (prev) =>
                    new Set([...prev, ...visibleItems.map((i) => i.id)]),
                )
                router.refresh()
              }}
            />
          </div>
        )}
      </div>

      {expanded && (
        <div className="space-y-3">
          {visibleItems.length === 0 ? (
            <p className="py-4 text-sm text-text-muted">
              You&apos;re all caught up. New notifications from the fellowship
              team will show up here.
            </p>
          ) : (
            visibleItems.map((item) => (
              <FeedRow
                key={item.id}
                item={item}
                now={now ?? new Date(item.publishedAt).getTime()}
                onDismissed={() => {
                  setDismissedIds((prev) => new Set(prev).add(item.id))
                  router.refresh()
                }}
              />
            ))
          )}
          {!hideViewAll && visibleItems.length > 0 && (
            <div className="pt-2">
              <Link
                href="/notifications"
                className="text-xs font-medium text-primary hover:underline"
              >
                View all notifications
              </Link>
            </div>
          )}
        </div>
      )}
    </>
  )

  if (!collapsible) return inner

  return (
    <Card className="border-0 shadow-card">
      <CardContent className="p-8">{inner}</CardContent>
    </Card>
  )
}

function MarkAllReadButton() {
  const [pending, startTransition] = useTransition()
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-8 text-xs"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await markAllNotificationsReadAction()
        })
      }
    >
      <CheckCheck className="h-3.5 w-3.5" aria-hidden />
      Mark all read
    </Button>
  )
}

function ClearAllButton({
  count,
  onCleared,
}: {
  count: number
  onCleared: () => void
}) {
  const [pending, startTransition] = useTransition()
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-8 text-xs text-text-muted hover:text-destructive"
      disabled={pending}
      aria-label={`Clear all ${count} notifications`}
      onClick={() =>
        startTransition(async () => {
          // Optimistic: hide them immediately. If the server fails
          // the next router.refresh will pull the truth back.
          onCleared()
          await dismissAllNotificationsAction()
        })
      }
    >
      <Trash2 className="h-3.5 w-3.5" aria-hidden />
      Clear all
    </Button>
  )
}

function FeedRow({
  item,
  now,
  onDismissed,
}: {
  item: FeedItemView
  now: number
  onDismissed: () => void
}) {
  const meta = KIND_META[item.kind] ?? KIND_META.announcement
  const Icon = meta.icon
  const [readPending, startReadTransition] = useTransition()
  const [dismissPending, startDismissTransition] = useTransition()
  const isUnread = !item.readAt

  function markRead() {
    if (!isUnread) return
    startReadTransition(async () => {
      await markNotificationReadAction(item.id)
    })
  }

  function dismiss() {
    startDismissTransition(async () => {
      // Optimistic: remove from the parent immediately so the row
      // disappears with no perceptible delay.
      onDismissed()
      await dismissNotificationAction(item.id)
    })
  }

  /*
    Visual weight scales with unread state so brand-new items pop:
      - Unread: solid card surface with a left accent stripe matching
        the notification kind, brighter background, full ring.
      - Read:   muted card with a subtle border, no accent stripe.
    The accent stripe + ring pattern is consistent with the kind
    badges, so users can recognize an Alert at a glance.
  */
  return (
    <div
      className={[
        'relative rounded-lg border transition-colors',
        isUnread
          ? `border-l-4 ${meta.accent} border-y-primary/20 border-r-primary/20 bg-primary/5 shadow-sm`
          : 'border-border bg-background',
        dismissPending ? 'opacity-50 pointer-events-none' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex items-start gap-3 p-3 sm:p-4">
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback className="bg-bg-muted text-xs">
            {item.author?.initials ?? 'WF'}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${meta.tone}`}
            >
              <Icon className="h-3 w-3" aria-hidden />
              {meta.label}
            </span>
            <p
              className={`text-sm ${isUnread ? 'font-semibold text-foreground' : 'font-medium text-text'}`}
            >
              {item.title}
            </p>
            {item.pinned && (
              <span className="inline-flex items-center gap-1 rounded-full bg-bg-muted px-2 py-0.5 text-xs text-text-muted">
                <Pin className="h-3 w-3" aria-hidden />
                Pinned
              </span>
            )}
            {isUnread && (
              <span
                className="inline-block h-2 w-2 rounded-full bg-primary"
                aria-label="Unread"
              />
            )}
          </div>
          <p className="text-xs text-text-muted">
            {item.author?.name ?? 'Fellowship team'}
            {' · '}
            {formatRelativeTime(item.publishedAt, now)}
          </p>
          <p className="whitespace-pre-line text-sm leading-relaxed text-text">
            {item.body}
          </p>

          {/*
            Two distinct affordances. `content` is set when an admin
            pins the notification to a curriculum item: a soft
            "Open the lab" link. `ctaUrl` is a free-form CTA the admin
            set in the notification dialog. Both can coexist.
          */}
          {(item.content || (item.ctaUrl && item.ctaLabel)) && (
            <div className="flex flex-wrap gap-2 pt-1">
              {item.content && (
                <Link
                  href={item.content.href}
                  onClick={markRead}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-muted/60 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-bg-muted"
                >
                  <BookOpen className="h-3.5 w-3.5" aria-hidden />
                  Open: {item.content.title}
                </Link>
              )}
              {item.ctaUrl && item.ctaLabel && (
                <Link
                  href={item.ctaUrl}
                  target={
                    /^https?:\/\//.test(item.ctaUrl) ? '_blank' : undefined
                  }
                  rel={
                    /^https?:\/\//.test(item.ctaUrl)
                      ? 'noopener noreferrer'
                      : undefined
                  }
                  onClick={markRead}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                >
                  {item.ctaLabel}
                  {/^https?:\/\//.test(item.ctaUrl) && (
                    <ExternalLink className="h-3 w-3" aria-hidden />
                  )}
                </Link>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-1">
          <button
            type="button"
            onClick={dismiss}
            disabled={dismissPending}
            className="-mr-1 -mt-1 inline-flex h-7 w-7 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Clear this notification"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
          {isUnread && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              disabled={readPending}
              onClick={markRead}
            >
              Mark read
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
