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
    const { data: labs, count } = await supabase
      .from('labs')
      .select('id, title, description, is_published, created_at, updated_at, phase_id', {
        count: 'exact',
      })
      .eq('is_published', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    return Response.json({
      items: labs || [],
      count: count || 0,
      page,
      pageSize,
    })
  } catch (error) {
    console.error('[v0] Error fetching draft content:', error)
    return Response.json(
      { error: 'Failed to fetch draft content' },
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
    const { beforeDate, labIds } = await request.json()

    if (!beforeDate && !labIds) {
      return Response.json(
        { error: 'Provide either beforeDate or labIds' },
        { status: 400 }
      )
    }

    let query = supabase.from('labs').delete()

    if (beforeDate) {
      query = query.lt('created_at', beforeDate)
    }
    if (labIds && labIds.length > 0) {
      query = query.in('id', labIds)
    }

    const { count, error } = await query

    if (error) throw error

    // Log the action
    if (adminId) {
      await logMaintenanceAction(adminId, {
        actionType: 'bulk_delete',
        itemType: 'labs',
        itemId: labIds?.[0] || 'batch',
        itemName: `${count} draft labs`,
        details: {
          count,
          beforeDate,
          labIds,
        },
      })
    }

    return Response.json({
      message: `Deleted ${count} draft labs`,
      deletedCount: count,
    })
  } catch (error) {
    console.error('[v0] Error deleting content:', error)
    return Response.json(
      { error: 'Failed to delete content' },
      { status: 500 }
    )
  }
}
