import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth-server'
import { logMaintenanceAction } from '@/lib/maintenance/audit-logging'

export async function GET(request: Request) {
  await requireAdmin()
  const supabase = await createClient()

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = 50
  const offset = (page - 1) * pageSize

  try {
    const { data: notifications, count } = await supabase
      .from('notifications')
      .select('id, title, status, scheduled_for, created_at, updated_at', {
        count: 'exact',
      })
      .neq('status', 'sent')
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    return Response.json({
      items: notifications || [],
      count: count || 0,
      page,
      pageSize,
    })
  } catch (error) {
    console.error('[v0] Error fetching notifications:', error)
    return Response.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  await requireAdmin()
  const supabase = await createClient()
  const user = await supabase.auth.getUser()
  const adminId = user.data.user?.id

  try {
    const { beforeDate, notificationIds } = await request.json()

    if (!beforeDate && !notificationIds) {
      return Response.json(
        { error: 'Provide either beforeDate or notificationIds' },
        { status: 400 }
      )
    }

    let query = supabase.from('notifications').delete()

    if (beforeDate) {
      query = query.lt('created_at', beforeDate)
    }
    if (notificationIds && notificationIds.length > 0) {
      query = query.in('id', notificationIds)
    }

    const { count, error } = await query

    if (error) throw error

    // Log the action
    if (adminId) {
      await logMaintenanceAction(adminId, {
        actionType: 'bulk_delete',
        itemType: 'notifications',
        itemId: notificationIds?.[0] || 'batch',
        itemName: `${count} notifications`,
        details: {
          count,
          beforeDate,
          notificationIds,
        },
      })
    }

    return Response.json({
      message: `Deleted ${count} notifications`,
      deletedCount: count,
    })
  } catch (error) {
    console.error('[v0] Error deleting notifications:', error)
    return Response.json(
      { error: 'Failed to delete notifications' },
      { status: 500 }
    )
  }
}
