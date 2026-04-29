'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { BookOpen, ChevronDown, ChevronUp, Pin } from 'lucide-react'
import type { DashboardAnnouncement } from '@/lib/dashboard-data'

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

export function AnnouncementsFeed({
  announcements,
}: {
  announcements: DashboardAnnouncement[]
}) {
  const [isExpanded, setIsExpanded] = useState(true)
  const now = useNow()

  return (
    <Card className="border-0 shadow-card">
      <CardContent className="p-8">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between gap-2 mb-6 hover:opacity-75 transition-opacity"
          aria-expanded={isExpanded}
        >
          <h3 className="font-serif text-lg text-primary">Announcements</h3>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-text-muted" aria-hidden />
          ) : (
            <ChevronDown className="w-5 h-5 text-text-muted" aria-hidden />
          )}
        </button>

        {isExpanded && (
          <div className="space-y-4">
            {announcements.length === 0 ? (
              <p className="text-sm text-text-muted py-4">
                No recent announcements.
              </p>
            ) : (
              announcements.map((ann) => (
                <div
                  key={ann.id}
                  className="space-y-2 pb-4 border-b border-border last:border-0 last:pb-0"
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarFallback className="text-xs bg-bg-muted">
                        {ann.author?.initials ?? 'WF'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-text">
                          {ann.title}
                        </p>
                        {ann.pinned && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-bg-muted px-2 py-0.5 text-xs text-text-muted">
                            <Pin className="w-3 h-3" aria-hidden />
                            Pinned
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-muted">
                        {ann.author?.name ?? 'Fellowship team'}
                        {' · '}
                        {formatRelativeTime(
                          ann.publishedAt,
                          now ?? new Date(ann.publishedAt).getTime(),
                        )}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-text leading-relaxed ml-11">
                    {ann.body}
                  </p>
                  {/*
                    When the curator pinned the announcement to a
                    curriculum item, render a focused "Open the lab"
                    affordance directly below the message. Stays in
                    the avatar's visual gutter so it threads with the
                    body copy. No-op when there's no pinned content.
                  */}
                  {ann.content && (
                    <Link
                      href={ann.content.href}
                      className="ml-11 inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-muted/60 px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-bg-muted"
                    >
                      <BookOpen className="h-3.5 w-3.5" aria-hidden />
                      Open: {ann.content.title}
                    </Link>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
