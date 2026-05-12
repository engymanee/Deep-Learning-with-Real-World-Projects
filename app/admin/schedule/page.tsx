'use server'

import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase/server'
import { CreatePollForm } from '@/components/schedule/create-poll-form'
import { AdminPollList } from '@/components/schedule/admin-poll-list'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default async function AdminSchedulePage() {
  const user = await requireUser()

  // Only admins can access this page
  if (user.role !== 'admin') {
    redirect('/dashboard')
  }

  const supabase = await createClient()

  // Get all fellows for the invite list
  const { data: fellows } = await supabase
    .from('users')
    .select('id, fullName')
    .eq('role', 'participant')
    .order('fullName')

  // Get all schedules created by this admin
  const { data: schedules } = await supabase
    .from('schedules')
    .select(`
      id,
      title,
      description,
      status,
      is_poll,
      voting_closes_at,
      created_at,
      schedule_options (
        id,
        start_time,
        end_time
      ),
      schedule_votes (
        id,
        user_id
      )
    `)
    .eq('created_by_admin', user.id)
    .order('created_at', { ascending: false })

  async function createPoll(data: {
    title: string
    description: string
    location: string
    meeting_link: string
    voting_closes_at: string
    options: Array<{ start_time: string; end_time: string }>
    invited_fellows: string[]
  }) {
    'use server'
    const supabase = await createClient()
    const user = await requireUser()

    // Create schedule
    const { data: schedule, error: scheduleError } = await supabase
      .from('schedules')
      .insert({
        title: data.title,
        description: data.description,
        location: data.location,
        meeting_link: data.meeting_link,
        status: 'polling',
        is_poll: true,
        voting_closes_at: data.voting_closes_at,
        created_by_admin: user.id,
      })
      .select()
      .single()

    if (scheduleError) throw scheduleError

    // Create schedule options
    const optionsToInsert = data.options.map((opt, index) => ({
      schedule_id: schedule.id,
      start_time: opt.start_time,
      end_time: opt.end_time,
      order_number: index,
    }))

    const { error: optionsError } = await supabase
      .from('schedule_options')
      .insert(optionsToInsert)

    if (optionsError) throw optionsError

    // Send invites to selected fellows
    // TODO: Implement email notification system
    console.log('[v0] Schedule created with invites sent to:', data.invited_fellows)

    redirect(`/admin/schedule/${schedule.id}`)
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="w-full">
        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl px-6 py-8">
            <h1 className="font-serif text-3xl font-bold text-foreground mb-2">
              Scheduling & Polls
            </h1>
            <p className="text-muted-foreground">
              Create scheduling polls and invite fellows to vote on availability
            </p>
          </div>
        </section>

        <section className="bg-background">
          <div className="mx-auto max-w-6xl px-6 py-8 space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Create New Poll</CardTitle>
                <CardDescription>
                  Create a scheduling poll and invite specific fellows to vote
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CreatePollForm
                  onSubmit={createPoll}
                  availableFellows={fellows || []}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Active & Past Polls</CardTitle>
                <CardDescription>
                  View results and manage your polls
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AdminPollList schedules={schedules || []} />
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  )
}
