'use server'

import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase/server'
import { CreatePollForm } from '@/components/schedule/create-poll-form'
import { AdminPollList } from '@/components/schedule/admin-poll-list'
import { createSchedulingNotification } from '@/lib/scheduling/notify'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default async function AdminSchedulePage() {
  await requireAdmin()
  const supabase = await createClient()

  // Get all active fellows
  const { data: fellows } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'fellow')
    .is('deactivated_at', null)
    .order('full_name')

  // Get all cohorts for team-based selection
  const { data: cohorts } = await supabase
    .from('cohorts')
    .select('id, name, school:schools(name)')
    .order('name')

  // Get schedules created by this admin
  let schedules: any[] = []
  try {
    const { data, error } = await supabase
      .from('schedules')
      .select(`
        id,
        title,
        description,
        event_date,
        status,
        is_poll,
        voting_closes_at,
        schedule_options(id, start_time, end_time, order_number),
        schedule_votes(id)
      `)
      .eq('created_by_admin', (await supabase.auth.getUser()).data.user?.id)
      .order('created_at', { ascending: false })
    
    if (error && error.code !== 'PGRST205') {
      console.error('[v0] Error fetching schedules:', error)
    }
    if (data) {
      schedules = data
    }
  } catch (error) {
    console.error('[v0] Error fetching schedules:', error)
  }

  async function createPoll(data: {
    title: string
    description: string
    location: string
    meeting_link: string
    voting_closes_at: string
    options: Array<{ start_time: string; end_time: string }>
    invited_fellows: string[]
    invited_cohorts: string[]
  }) {
    'use server'
    const supabase = await createClient()
    const admin = await requireAdmin()

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
        created_by_admin: admin.id,
      })
      .select('id')
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

    // Resolve all recipients: direct fellows + fellows in selected cohorts
    const selectedFellowIds = new Set(data.invited_fellows)

    if (data.invited_cohorts.length > 0) {
      const { data: cohortMembers } = await supabase
        .from('cohort_members')
        .select('profile_id')
        .in('cohort_id', data.invited_cohorts)

      cohortMembers?.forEach((m) => selectedFellowIds.add(m.profile_id))
    }

    // Send notifications to all selected fellows
    if (selectedFellowIds.size > 0) {
      await createSchedulingNotification(
        schedule.id,
        data.title,
        Array.from(selectedFellowIds),
        admin.id
      )
    }

    redirect(`/admin/schedule/${schedule.id}`)
  }

  async function deletePoll(scheduleId: string) {
    'use server'
    const supabase = await createClient()
    const admin = await requireAdmin()

    // Verify the poll belongs to this admin
    const { data: schedule } = await supabase
      .from('schedules')
      .select('id, created_by_admin')
      .eq('id', scheduleId)
      .single()

    if (!schedule || schedule.created_by_admin !== admin.id) {
      throw new Error('Unauthorized to delete this poll')
    }

    // Delete the schedule - cascading deletes will remove options and votes
    const { error } = await supabase.from('schedules').delete().eq('id', scheduleId)

    if (error) throw error
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-serif text-3xl font-bold text-foreground">
          Scheduling &amp; Availability
        </h1>
        <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
          Create scheduling polls to find the best time for your group meetings. Select individual
          fellows or entire cohorts to invite them to set their availability.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Create New Poll</CardTitle>
            <CardDescription>
              Create a scheduling poll and invite fellows or teams to vote on their availability
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreatePollForm
              onSubmit={createPoll}
              availableFellows={fellows || []}
              availableCohorts={
                cohorts?.map((c) => ({
                  id: c.id,
                  name: c.name,
                  schoolName: (c.school as any)?.name,
                })) || []
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active &amp; Past Polls</CardTitle>
            <CardDescription>
              View results and manage your availability polls
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AdminPollList 
              schedules={schedules || []}
              onDeletePoll={deletePoll}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
