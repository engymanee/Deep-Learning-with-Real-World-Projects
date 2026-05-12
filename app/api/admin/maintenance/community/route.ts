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
    const { data: posts, count } = await supabase
      .from('community_posts')
      .select(
        'id, title, created_at, updated_at, created_by, profiles!community_posts_created_by_fkey(full_name)',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    return Response.json({
      items: posts || [],
      count: count || 0,
      page,
      pageSize,
    })
  } catch (error) {
    console.error('[v0] Error fetching community posts:', error)
    return Response.json(
      { error: 'Failed to fetch community posts' },
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
    const { beforeDate, postIds } = await request.json()

    if (!beforeDate && !postIds) {
      return Response.json(
        { error: 'Provide either beforeDate or postIds' },
        { status: 400 }
      )
    }

    let query = supabase.from('community_posts').delete()

    if (beforeDate) {
      query = query.lt('created_at', beforeDate)
    }
    if (postIds && postIds.length > 0) {
      query = query.in('id', postIds)
    }

    const { count, error } = await query

    if (error) throw error

    // Log the action
    if (adminId) {
      await logMaintenanceAction(adminId, {
        actionType: 'bulk_delete',
        itemType: 'community_posts',
        itemId: postIds?.[0] || 'batch',
        itemName: `${count} community posts`,
        details: {
          count,
          beforeDate,
          postIds,
        },
      })
    }

    return Response.json({
      message: `Deleted ${count} community posts`,
      deletedCount: count,
    })
  } catch (error) {
    console.error('[v0] Error deleting community posts:', error)
    return Response.json(
      { error: 'Failed to delete community posts' },
      { status: 500 }
    )
  }
}
