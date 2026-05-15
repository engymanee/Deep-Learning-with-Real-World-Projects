'use server'

import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase/server'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ScheduleVotingForm } from '@/components/schedule/voting-form'

export default async function ScheduleVotingPage({
  params,
}: {
  params: { id: string }
}) {
  const user = await requireUser()
  const supabase = await createClient()

  try {
    // Fetch the schedule
    const { data: schedule, error: scheduleError } = await supabase
      .from('schedules')
      .select(
        `
        id,
        title,
        description,
        location,
        meeting_link,
        status,
        is_poll,
        voting_closes_at,
        schedule_options (
          id,
          start_time,
          end_time,
          order_number
      )
    `,
    )
    .eq('id', params.id)
    .single()

    if (scheduleError?.code === 'PGRST205') {
      // Table doesn't exist yet
      redirect('/dashboard')
    }

    if (scheduleError || !schedule) {
      redirect('/dashboard')
    }

    // Check if voting is still open
    if (schedule.voting_closes_at) {
      const closesAt = new Date(schedule.voting_closes_at)
      if (closesAt < new Date()) {
        redirect('/dashboard')
      }
    }

    // Fetch user's existing votes (if any)
    const { data: existingVote } = await supabase
      .from('schedule_votes')
      .select('id, option_id')
      .eq('schedule_id', schedule.id)
      .eq('user_id', user.id)
      .maybeSingle()

    async function submitVote(optionId: string) {
      'use server'
      const supabase = await createClient()
      const user = await requireUser()

      // If user already voted, update their vote
      if (existingVote) {
        await supabase
          .from('schedule_votes')
          .update({ option_id: optionId })
          .eq('id', existingVote.id)
      } else {
        // Otherwise, create a new vote
        await supabase.from('schedule_votes').insert({
          schedule_id: schedule!.id,
          user_id: user.id,
          option_id: optionId,
        })
      }

      redirect(`/schedule/${schedule!.id}/thank-you`)
    }

    return (
      <div className="min-h-screen bg-background">
        <main className="w-full">
          <section className="border-b border-border">
            <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
              <h1 className="font-serif text-3xl font-bold text-foreground mb-2">
                {schedule.title}
              </h1>
              {schedule.description && (
                <p className="text-muted-foreground">{schedule.description}</p>
              )}
            </div>
          </section>

          <section className="bg-background">
            <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Meeting Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium">{schedule.location}</p>
                  </div>
                  {schedule.meeting_link && (
                    <div>
                      <p className="text-sm text-muted-foreground">Meeting Link</p>
                      <a
                        href={schedule.meeting_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 hover:underline break-all"
                      >
                        {schedule.meeting_link}
                      </a>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Voting Closes</p>
                    <p className="font-medium">
                      {new Date(schedule.voting_closes_at).toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                <CardTitle>Select Your Availability</CardTitle>
                <CardDescription>
                  Choose the time slot(s) when you are available
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScheduleVotingForm
                  scheduleId={schedule.id}
                  options={schedule.schedule_options || []}
                  existingVoteOptionId={existingVote?.option_id}
                  onSubmit={submitVote}
                />
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
    )
  } catch (error) {
    console.error('[v0] Error in schedule page:', error)
    redirect('/dashboard')
  }
}
