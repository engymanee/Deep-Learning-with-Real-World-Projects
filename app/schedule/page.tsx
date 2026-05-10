import { requireUser } from '@/lib/auth-server'
import { TopBar } from '@/components/top-bar'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { format } from 'date-fns'
import { Calendar, Clock, MapPin } from 'lucide-react'

export const metadata = {
  title: 'Schedule - Wisdom at Work',
  description: 'View and vote on event schedules',
}

export default async function SchedulePage() {
  const user = await requireUser()
  const supabase = await createClient()

  // Fetch schedules - show active polls and confirmed events
  const { data: schedules, error } = await supabase
    .from('schedules')
    .select('*')
    .in('status', ['polling', 'scheduled'])
    .order('event_date', { ascending: true })

  if (error) {
    console.error('[v0] Error fetching schedules:', error)
  }

  const activePolls = schedules?.filter((s) => s.status === 'polling') || []
  const confirmedEvents = schedules?.filter((s) => s.status === 'scheduled') || []

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <main className="w-full">
        <section className="border-b border-border">
          <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
            <h1 className="font-serif text-3xl sm:text-4xl text-foreground font-bold mb-2">
              Event Scheduling
            </h1>
            <p className="text-muted-foreground">
              Vote on available times for upcoming events or view confirmed
              schedules.
            </p>
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12 space-y-8">
            {/* Active Polls Section */}
            {activePolls.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xl font-semibold">Active Polls</h2>
                <div className="space-y-3">
                  {activePolls.map((schedule) => (
                    <Card
                      key={schedule.id}
                      className="hover:shadow-md transition-shadow"
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="font-semibold mb-1">
                              {schedule.title}
                            </h3>
                            {schedule.description && (
                              <p className="text-sm text-muted-foreground mb-3">
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
                              {schedule.voting_closes_at && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  Voting closes{' '}
                                  {format(
                                    new Date(schedule.voting_closes_at),
                                    'MMM d'
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex-shrink-0">
                            <Badge>Voting Open</Badge>
                            <Link href={`/schedule/${schedule.id}`}>
                              <Button size="sm" className="mt-2" variant="default">
                                Vote Now
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Confirmed Events Section */}
            {confirmedEvents.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-xl font-semibold">Confirmed Events</h2>
                <div className="space-y-3">
                  {confirmedEvents.map((schedule) => (
                    <Card
                      key={schedule.id}
                      className="hover:shadow-md transition-shadow"
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="font-semibold mb-1">
                              {schedule.title}
                            </h3>
                            {schedule.description && (
                              <p className="text-sm text-muted-foreground mb-3">
                                {schedule.description}
                              </p>
                            )}

                            <div className="flex flex-wrap gap-3 text-sm">
                              {schedule.event_date && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  {format(new Date(schedule.event_date), 'EEEE, MMMM d')}
                                </div>
                              )}
                              {schedule.start_time && (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  {schedule.start_time}
                                  {schedule.end_time && ` - ${schedule.end_time}`}
                                </div>
                              )}
                              {schedule.location && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4 text-muted-foreground" />
                                  {schedule.location}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex-shrink-0">
                            <Badge variant="secondary">Scheduled</Badge>
                            <Link href={`/schedule/${schedule.id}`}>
                              <Button size="sm" className="mt-2" variant="outline">
                                View Details
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {activePolls.length === 0 && confirmedEvents.length === 0 && (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">
                    No active polls or scheduled events yet. Check back soon!
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
