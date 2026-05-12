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
    const { data: resources, count } = await supabase
      .from('library_resources')
      .select('id, title, resource_type, created_at, updated_at, cohort_code', {
        count: 'exact',
      })
      .is('cohort_code', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    return Response.json({
      items: resources || [],
      count: count || 0,
      page,
      pageSize,
    })
  } catch (error) {
    console.error('[v0] Error fetching unassigned resources:', error)
    return Response.json(
      { error: 'Failed to fetch unassigned resources' },
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
    const { beforeDate, resourceIds } = await request.json()

    if (!beforeDate && !resourceIds) {
      return Response.json(
        { error: 'Provide either beforeDate or resourceIds' },
        { status: 400 }
      )
    }

    let query = supabase.from('library_resources').delete()

    if (beforeDate) {
      query = query.lt('created_at', beforeDate)
    }
    if (resourceIds && resourceIds.length > 0) {
      query = query.in('id', resourceIds)
    }

    const { count, error } = await query

    if (error) throw error

    // Log the action
    if (adminId) {
      await logMaintenanceAction(adminId, {
        actionType: 'bulk_delete',
        itemType: 'library_resources',
        itemId: resourceIds?.[0] || 'batch',
        itemName: `${count} resources`,
        details: {
          count,
          beforeDate,
          resourceIds,
        },
      })
    }

    return Response.json({
      message: `Deleted ${count} resources`,
      deletedCount: count,
    })
  } catch (error) {
    console.error('[v0] Error deleting resources:', error)
    return Response.json(
      { error: 'Failed to delete resources' },
      { status: 500 }
    )
  }
}
