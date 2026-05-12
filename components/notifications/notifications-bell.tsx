'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'

const fetcher = (url: string) =>
  fetch(url, { cache: 'no-store' }).then(async (res) => {
    if (!res.ok) return { count: 0 }
    return (await res.json()) as { count: number }
  })

/**
 * Lightweight bell that lives in the top bar. Uses SWR to keep the
 * unread count fresh without forcing a full layout refresh; revalidates
 * on focus and every 60 seconds. Clicking takes the user to the full
 * notifications inbox where they can mark items read.
 */
export function NotificationsBell() {
  const { data } = useSWR<{ count: number }>(
    '/api/notifications/unread-count',
    fetcher,
    {
      refreshInterval: 60_000,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    },
  )

  const count = data?.count ?? 0
  const display = count > 99 ? '99+' : String(count)

  const hasUnread = count > 0

  return (
    <Button
      asChild
      variant="ghost"
      size="icon"
      className="relative text-white hover:bg-primary-light"
      aria-label={
        hasUnread ? `Notifications (${count} unread)` : 'Notifications'
      }
    >
      <Link href="/notifications">
        {/*
          When there are unread notifications we layer two cues on
          top of the bell so it's hard to miss:
            1. A faint outward ping ring around the icon (animate-ping)
            2. A solid badge in the top-right corner with the count
          The ping is purely decorative and aria-hidden.
        */}
        {hasUnread && (
          <span
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
            aria-hidden
          >
            <span className="absolute h-7 w-7 animate-ping rounded-full bg-destructive/40" />
          </span>
        )}
        <Bell className="relative h-5 w-5" aria-hidden />
        {hasUnread ? (
          <span
            className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-semibold leading-[18px] text-white shadow-sm ring-2 ring-primary"
            aria-hidden
          >
            {display}
          </span>
        ) : null}
      </Link>
    </Button>
  )
}
