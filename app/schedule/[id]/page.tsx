import { requireUser } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import { TopBar } from '@/components/top-bar'
import { createClient } from '@/lib/supabase/server'
import { PollVoting } from '@/components/schedule/poll-voting'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata = {
  title: 'Schedule Poll - Wisdom at Work',
  description: 'Vote on your availability for upcoming events',
}

interface ScheduleDetailPageProps {
  params: { id: string }
}

export default async function ScheduleDetailPage({
  params,
}: ScheduleDetailPageProps) {
  const user = await requireUser()
  const supabase = await createClient()
  const scheduleId = params.id

  // Fetch schedule
  const { data: schedule, error: scheduleError } = await supabase
    .from('schedules')
    .select('*')
    .eq('id', scheduleId)
    .single()

  if (scheduleError || !schedule) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar />
        <main className="w-full">
          <section>
            <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">
                    Schedule not found.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>
        </main>
      </div>
    )
  }

  // Fetch options if it's a poll
  let options = []
  if (schedule.is_poll) {
    const { data: optionsData } = await supabase
      .from('schedule_options')
      .select('*')
      .eq('schedule_id', scheduleId)
      .order('order_number', { ascending: true })

    options = optionsData || []
  }

  // Fetch votes (admin sees all, users see only theirs)
  let userVote = null
  let allVotes: any[] = []

  const isAdmin = user.role === 'admin' || schedule.created_by_admin === user.id

  const { data: voteData } = await supabase
    .from('schedule_votes')
    .select(
      `
      id,
      user_id,
      preferred_option_id,
      created_at,
      users:user_id (full_name, email)
    `
    )
    .eq('schedule_id', scheduleId)

  if (voteData) {
    if (isAdmin) {
      allVotes = voteData
    } else {
      userVote = voteData.find((v: any) => v.user_id === user.id) || null
    }
  }

  const handleVote = async (optionId: string) => {
    'use server'

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/schedules/${scheduleId}/vote`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ preferred_option_id: optionId }),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to record vote')
      }
    } catch (err) {
      console.error('[v0] Error recording vote:', err)
      throw err
    }
  }

  const handleFinalize = async (optionId: string) => {
    'use server'

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/schedules/${scheduleId}/finalize`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ selected_option_id: optionId }),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to finalize schedule')
      }
    } catch (err) {
      console.error('[v0] Error finalizing schedule:', err)
      throw err
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <main className="w-full">
        <section className="border-b border-border">
          <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
            <h1 className="font-serif text-3xl sm:text-4xl text-foreground font-bold mb-2">
              {schedule.title}
            </h1>
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
            {schedule.is_poll ? (
              <PollVoting
                schedule={schedule}
                options={options}
                userVote={userVote}
                allVotes={isAdmin ? allVotes : []}
                isAdmin={isAdmin}
                onVote={handleVote}
                onFinalize={handleFinalize}
              />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Event Confirmed</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    This event has been scheduled and confirmed.
                  </p>
                  {schedule.event_date && (
                    <p>
                      <strong>Date:</strong> {schedule.event_date}
                    </p>
                  )}
                  {schedule.start_time && (
                    <p>
                      <strong>Time:</strong> {schedule.start_time}
                      {schedule.end_time && ` - ${schedule.end_time}`}
                    </p>
                  )}
                  {schedule.location && (
                    <p>
                      <strong>Location:</strong> {schedule.location}
                    </p>
                  )}
                  {schedule.meeting_link && (
                    <p>
                      <strong>Meeting Link:</strong>{' '}
                      <a
                        href={schedule.meeting_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {schedule.meeting_link}
                      </a>
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
