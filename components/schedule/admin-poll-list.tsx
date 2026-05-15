'use client'

import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Calendar, Clock, MapPin, Users } from 'lucide-react'

interface Schedule {
  id: string
  title: string
  description: string | null
  location: string | null
  status: 'polling' | 'scheduled' | 'completed'
  is_poll: boolean
  voting_closes_at: string | null
  event_date: string
  start_time: string | null
  created_at: string
}

interface AdminPollListProps {
  schedules: Schedule[]
}

export function AdminPollList({ schedules }: AdminPollListProps) {
  const pollCount = schedules.filter((s) => s.is_poll).length
  const scheduledCount = schedules.filter((s) => s.status === 'scheduled').length

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Active Polls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {schedules.filter((s) => s.status === 'polling').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting responses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Scheduled Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{scheduledCount}</div>
            <p className="text-xs text-muted-foreground">
              Confirmed and sent
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Polls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pollCount}</div>
            <p className="text-xs text-muted-foreground">
              Created this cycle
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold">All Polls & Events</h3>
        {schedules.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                No polls or events yet. Create one to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          schedules.map((schedule) => (
            <Card key={schedule.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold mb-1 truncate">
                      {schedule.title}
                    </h4>
                    {schedule.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {schedule.description}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {schedule.location && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {schedule.location}
                        </div>
                      )}
                      {schedule.start_time && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {schedule.start_time}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 items-end">
                    <Badge
                      variant={
                        schedule.status === 'polling' ? 'default' : 'secondary'
                      }
                    >
                      {schedule.status === 'polling'
                        ? 'Voting Open'
                        : 'Scheduled'}
                    </Badge>

                    {schedule.voting_closes_at && (
                      <p className="text-xs text-muted-foreground">
                        Closes{' '}
                        {format(new Date(schedule.voting_closes_at), 'MMM d')}
                      </p>
                    )}

                    <Link href={`/admin/schedule/${schedule.id}`}>
                      <Button size="sm" variant="outline">
                        View Results
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
