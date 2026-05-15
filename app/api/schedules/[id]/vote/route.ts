import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth-server'
import { NextResponse } from 'next/server'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const { id } = await params
    const supabase = await createClient()
    const scheduleId = id

    const body = await req.json()
    const { preferred_option_id } = body

    // Verify schedule exists and is in polling status
    const { data: schedule, error: scheduleError } = await supabase
      .from('schedules')
      .select('*')
      .eq('id', scheduleId)
      .single()

    if (scheduleError || !schedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      )
    }

    if (schedule.status !== 'polling') {
      return NextResponse.json(
        { error: 'Voting period has ended' },
        { status: 400 }
      )
    }

    if (new Date(schedule.voting_closes_at!) < new Date()) {
      return NextResponse.json(
        { error: 'Voting has closed' },
        { status: 400 }
      )
    }

    // Upsert user's vote
    const { data, error } = await supabase
      .from('schedule_votes')
      .upsert({
        user_id: user.id,
        schedule_id: scheduleId,
        preferred_option_id,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ vote: data }, { status: 200 })
  } catch (error) {
    console.error('[v0] Error recording vote:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
