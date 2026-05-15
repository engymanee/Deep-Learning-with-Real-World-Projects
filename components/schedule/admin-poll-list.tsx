'use client'

import { format } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Calendar, Clock, MapPin, ChevronRight } from 'lucide-react'
import { DeletePollModal } from './delete-poll-modal'

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
  onDeletePoll?: (scheduleId: string) => Promise<void>
}

export function AdminPollList({ schedules, onDeletePoll }: AdminPollListProps) {
  const pollCount = schedules.filter((s) => s.is_poll).length
  const activePollCount = schedules.filter((s) => s.status === 'polling').length
  const scheduledCount = schedules.filter((s) => s.status === 'scheduled').length

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border border-border/50">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold">{activePollCount}</div>
            <p className="text-sm text-muted-foreground mt-1">Active Polls</p>
          </CardContent>
        </Card>

        <Card className="border border-border/50">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold">{scheduledCount}</div>
            <p className="text-sm text-muted-foreground mt-1">Confirmed Events</p>
          </CardContent>
        </Card>

        <Card className="border border-border/50">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold">{pollCount}</div>
            <p className="text-sm text-muted-foreground mt-1">Total Created</p>
          </CardContent>
        </Card>
      </div>

      {/* Poll List */}
      <div>
        <h3 className="font-semibold text-foreground mb-4">Your Polls</h3>
        {schedules.length === 0 ? (
          <Card className="border border-dashed">
            <CardContent className="pt-6 pb-6 text-center">
              <p className="text-muted-foreground">
                No polls yet. Create one to get started with scheduling.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {schedules.map((schedule) => (
              <Card
                key={schedule.id}
                className="border border-border hover:border-border/80 hover:shadow-sm transition-all duration-200 group"
              >
                <CardContent className="pt-4 pb-4 px-4">
                  <div className="flex items-start justify-between gap-4">
                    {/* Left Content */}
                    <div className="flex-1 min-w-0">
                      <Link href={`/admin/schedule/${schedule.id}`}>
                        <h4 className="font-semibold text-foreground group-hover:text-blue-600 transition-colors truncate">
                          {schedule.title}
                        </h4>
                      </Link>

                      {schedule.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {schedule.description}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-3 mt-3">
                        {schedule.location && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5" />
                            <span>{schedule.location}</span>
                          </div>
                        )}

                        {schedule.voting_closes_at && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>Closes {format(new Date(schedule.voting_closes_at), 'MMM d')}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          schedule.status === 'polling' ? 'default' : 'secondary'
                        }
                        className="whitespace-nowrap"
                      >
                        {schedule.status === 'polling' ? 'Voting Open' : 'Scheduled'}
                      </Badge>

                      <Link href={`/admin/schedule/${schedule.id}`}>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1.5"
                        >
                          View Results
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>

                      <DeletePollModal
                        scheduleId={schedule.id}
                        scheduleTitle={schedule.title}
                        deletePoll={onDeletePoll || (async () => {})}
                        variant="icon"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
