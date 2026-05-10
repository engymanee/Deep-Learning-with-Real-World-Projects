import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth-server'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  try {
    const user = await requireUser()
    const supabase = await createClient()
    const url = new URL(req.url)
    const adminOnly = url.searchParams.get('admin') === 'true'

    if (adminOnly && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      )
    }

    let query = supabase
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
        created_by_admin,
        event_date,
        start_time,
        end_time,
        created_at
      `
      )

    if (adminOnly) {
      // Show all polls and scheduled events for admin
      query = query.in('status', ['polling', 'scheduled'])
    } else {
      // Show only scheduled events for fellows
      query = query.eq('status', 'scheduled')
    }

    const { data, error } = await query.order('event_date', {
      ascending: true,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ schedules: data })
  } catch (error) {
    console.error('[v0] Error fetching schedules:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser()

    // Only admins can create polls
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized: Only admins can create polls' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const {
      title,
      description,
      location,
      meeting_link,
      module_id,
      voting_closes_at,
      options,
    } = body

    const supabase = await createClient()

    // Create the poll schedule
    const { data: schedule, error: scheduleError } = await supabase
      .from('schedules')
      .insert({
        title,
        description,
        location,
        meeting_link,
        module_id,
        status: 'polling',
        is_poll: true,
        voting_closes_at,
        created_by_admin: user.id,
        event_date: new Date().toISOString().split('T')[0], // Placeholder until confirmed
      })
      .select()
      .single()

    if (scheduleError) {
      return NextResponse.json(
        { error: scheduleError.message },
        { status: 500 }
      )
    }

    // Add time slot options
    if (options && options.length > 0) {
      const optionsData = options.map(
        (opt: { start_time: string; end_time: string }, index: number) => ({
          schedule_id: schedule.id,
          start_time: opt.start_time,
          end_time: opt.end_time,
          order_number: index + 1,
        })
      )

      const { error: optionsError } = await supabase
        .from('schedule_options')
        .insert(optionsData)

      if (optionsError) {
        return NextResponse.json(
          { error: optionsError.message },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ schedule }, { status: 201 })
  } catch (error) {
    console.error('[v0] Error creating poll:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
