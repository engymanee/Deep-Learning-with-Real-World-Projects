import { requireUser } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import { TopBar } from '@/components/top-bar'
import { CreatePollForm } from '@/components/schedule/create-poll-form'
import { AdminPollList } from '@/components/schedule/admin-poll-list'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Schedule Admin - Wisdom at Work',
  description: 'Manage scheduling polls and events',
}

export default async function AdminSchedulePage() {
  const user = await requireUser()

  // Only admins can access this page
  if (user.role !== 'admin') {
    redirect('/')
  }

  const supabase = await createClient()

  // Fetch all admin polls
  const { data: schedules, error } = await supabase
    .from('schedules')
    .select('*')
    .in('status', ['polling', 'scheduled'])
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[v0] Error fetching schedules:', error)
  }

  const handleCreatePoll = async (data: {
    title: string
    description: string
    location: string
    meeting_link: string
    voting_closes_at: string
    options: Array<{ start_time: string; end_time: string }>
  }) => {
    'use server'

    const supabase = await createClient()
    const user = await requireUser()

    // Create poll through API
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/schedules`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...data,
            module_id: '00000000-0000-0000-0000-000000000000', // Default module - can be customized
          }),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to create poll')
      }
    } catch (err) {
      console.error('[v0] Error creating poll:', err)
      throw err
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <main className="w-full">
        <section className="border-b border-border">
          <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
            <div className="space-y-2 mb-6">
              <h1 className="font-serif text-3xl sm:text-4xl text-foreground font-bold">
                Schedule Management
              </h1>
              <p className="text-muted-foreground">
                Create polls for fellows to vote on available times, then
                schedule events and send invitations.
              </p>
            </div>

            <CreatePollForm onSubmit={handleCreatePoll} />
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
            <AdminPollList schedules={schedules || []} />
          </div>
        </section>
      </main>
    </div>
  )
}
