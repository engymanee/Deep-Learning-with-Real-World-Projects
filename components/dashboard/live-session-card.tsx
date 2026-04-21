'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Calendar } from 'lucide-react'
import type { DashboardSession } from '@/lib/dashboard-data'

function formatSessionTime(date: Date): string {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  })
}

/**
 * Live-updating clock that ticks every 30s. Returns null on the first
 * render so SSR and the first client render match.
 */
function useNow(intervalMs = 30_000): number | null {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

export function LiveSessionCard({ session }: { session: DashboardSession }) {
  const now = useNow()
  const startMs = new Date(session.startTime).getTime()
  const endMs = new Date(session.endTime).getTime()
  // Pre-hydration assume not joinable so SSR markup is stable.
  const effectiveNow = now ?? startMs - 60 * 60 * 1000
  const tenMinBefore = startMs - 10 * 60 * 1000
  const isLive = effectiveNow >= startMs && effectiveNow < endMs
  const canJoin = effectiveNow >= tenMinBefore && effectiveNow < endMs

  return (
    <Card className="border-0 shadow-card">
      <CardContent className="p-8 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1">
            {isLive ? (
              <div
                className="flex items-center gap-2 mt-1 flex-shrink-0"
                aria-label="Live now"
              >
                <span className="relative flex w-2.5 h-2.5">
                  <span className="absolute inline-flex w-full h-full rounded-full bg-red-500 opacity-75 animate-ping" />
                  <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-red-500" />
                </span>
                <span className="text-xs font-medium text-red-600 uppercase tracking-wide">
                  Live now
                </span>
              </div>
            ) : (
              <Calendar className="w-5 h-5 text-text-muted mt-1 flex-shrink-0" />
            )}

            <div className="flex-1 min-w-0">
              <h3 className="font-serif text-lg text-primary">{session.title}</h3>
              <p className="text-sm text-text-muted mt-1">
                {formatSessionTime(new Date(session.startTime))}
              </p>
            </div>
          </div>

          {session.joinUrl ? (
            <a
              href={canJoin ? session.joinUrl : undefined}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={!canJoin}
              tabIndex={canJoin ? 0 : -1}
            >
              <Button
                disabled={!canJoin}
                variant={canJoin ? 'default' : 'outline'}
                size="sm"
              >
                Join
              </Button>
            </a>
          ) : (
            <Button disabled variant="outline" size="sm">
              Join
            </Button>
          )}
        </div>

        {session.facilitators.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {session.facilitators.map((fac) => (
                <Avatar key={fac.id} className="w-7 h-7 border border-background">
                  <AvatarFallback className="text-xs bg-bg-muted">
                    {fac.initials}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            <span className="text-xs text-text-muted">
              {session.facilitators.map((f) => f.name).join(', ')}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
