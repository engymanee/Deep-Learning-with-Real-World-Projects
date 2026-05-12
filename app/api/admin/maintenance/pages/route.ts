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
    const { data: pages, count } = await supabase
      .from('custom_pages')
      .select('id, title, slug, is_published, created_at, updated_at', {
        count: 'exact',
      })
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    return Response.json({
      items: pages || [],
      count: count || 0,
      page,
      pageSize,
    })
  } catch (error) {
    console.error('[v0] Error fetching custom pages:', error)
    return Response.json(
      { error: 'Failed to fetch custom pages' },
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
    const { beforeDate, pageIds } = await request.json()

    if (!beforeDate && !pageIds) {
      return Response.json(
        { error: 'Provide either beforeDate or pageIds' },
        { status: 400 }
      )
    }

    let query = supabase.from('custom_pages').delete()

    if (beforeDate) {
      query = query.lt('created_at', beforeDate)
    }
    if (pageIds && pageIds.length > 0) {
      query = query.in('id', pageIds)
    }

    const { count, error } = await query

    if (error) throw error

    // Log the action
    if (adminId) {
      await logMaintenanceAction(adminId, {
        actionType: 'bulk_delete',
        itemType: 'custom_pages',
        itemId: pageIds?.[0] || 'batch',
        itemName: `${count} custom pages`,
        details: {
          count,
          beforeDate,
          pageIds,
        },
      })
    }

    return Response.json({
      message: `Deleted ${count} custom pages`,
      deletedCount: count,
    })
  } catch (error) {
    console.error('[v0] Error deleting custom pages:', error)
    return Response.json(
      { error: 'Failed to delete custom pages' },
      { status: 500 }
    )
  }
}
