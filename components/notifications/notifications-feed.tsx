'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
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
} from 'lucide-react'
import {
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
  { label: string; icon: typeof Bell; tone: string }
> = {
  announcement: {
    label: 'Announcement',
    icon: Megaphone,
    tone: 'bg-secondary text-secondary-foreground',
  },
  reminder: {
    label: 'Reminder',
    icon: Bell,
    tone: 'bg-primary/10 text-primary',
  },
  alert: {
    label: 'Alert',
    icon: AlertTriangle,
    tone: 'bg-destructive/10 text-destructive',
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
  const unreadCount = useMemo(
    () => items.filter((i) => !i.readAt).length,
    [items],
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
        {unreadCount > 0 && expanded && (
          <MarkAllReadButton />
        )}
      </div>

      {expanded && (
        <div className="space-y-4">
          {items.length === 0 ? (
            <p className="py-4 text-sm text-text-muted">No notifications yet.</p>
          ) : (
            items.map((item) => (
              <FeedRow
                key={item.id}
                item={item}
                now={now ?? new Date(item.publishedAt).getTime()}
              />
            ))
          )}
          {!hideViewAll && items.length > 0 && (
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

function FeedRow({ item, now }: { item: FeedItemView; now: number }) {
  const meta = KIND_META[item.kind] ?? KIND_META.announcement
  const Icon = meta.icon
  const [pending, startTransition] = useTransition()
  const isUnread = !item.readAt

  function markRead() {
    if (!isUnread) return
    startTransition(async () => {
      await markNotificationReadAction(item.id)
    })
  }

  return (
    <div
      className={`space-y-2 border-b border-border pb-4 last:border-0 last:pb-0 ${
        isUnread ? 'rounded-md bg-primary/5 p-3 -mx-3' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback className="bg-bg-muted text-xs">
            {item.author?.initials ?? 'WF'}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${meta.tone}`}
            >
              <Icon className="h-3 w-3" aria-hidden />
              {meta.label}
            </span>
            <p className="text-sm font-medium text-text">{item.title}</p>
            {item.pinned && (
              <span className="inline-flex items-center gap-1 rounded-full bg-bg-muted px-2 py-0.5 text-xs text-text-muted">
                <Pin className="h-3 w-3" aria-hidden />
                Pinned
              </span>
            )}
            {isUnread && (
              <span
                className="inline-block h-1.5 w-1.5 rounded-full bg-primary"
                aria-label="Unread"
              />
            )}
          </div>
          <p className="text-xs text-text-muted">
            {item.author?.name ?? 'Fellowship team'}
            {' · '}
            {formatRelativeTime(item.publishedAt, now)}
          </p>
        </div>
        {isUnread && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            disabled={pending}
            onClick={markRead}
          >
            Mark read
          </Button>
        )}
      </div>
      <p className="ml-11 whitespace-pre-line text-sm leading-relaxed text-text">
        {item.body}
      </p>

      {/*
        Two distinct affordances. `content` is set when an admin pins
        the notification to a curriculum item: a soft "Open the lab"
        link. `ctaUrl` is a free-form CTA the admin set in the
        notification dialog. Both can coexist.
      */}
      {item.content && (
        <Link
          href={item.content.href}
          onClick={markRead}
          className="ml-11 inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-muted/60 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-bg-muted"
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
            /^https?:\/\//.test(item.ctaUrl) ? 'noopener noreferrer' : undefined
          }
          onClick={markRead}
          className="ml-11 inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          {item.ctaLabel}
          {/^https?:\/\//.test(item.ctaUrl) && (
            <ExternalLink className="h-3 w-3" aria-hidden />
          )}
        </Link>
      )}
    </div>
  )
}
