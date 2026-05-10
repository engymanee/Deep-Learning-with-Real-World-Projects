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

  return (
    <Button
      asChild
      variant="ghost"
      size="icon"
      className="relative text-white hover:bg-primary-light"
      aria-label={
        count > 0 ? `Notifications (${count} unread)` : 'Notifications'
      }
    >
      <Link href="/notifications">
        <Bell className="h-5 w-5" aria-hidden />
        {count > 0 ? (
          <span
            className="absolute -right-0.5 -top-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-4 text-white"
            aria-hidden
          >
            {display}
          </span>
        ) : null}
      </Link>
    </Button>
  )
}
