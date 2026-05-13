import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    const supabase = await createClient()

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = 50
    const offset = (page - 1) * pageSize

    const actionType = searchParams.get('actionType')
    const itemType = searchParams.get('itemType')
    const search = searchParams.get('search')

    let query = supabase
      .from('maintenance_audit_log')
      .select(
        `
        id,
        created_at,
        action_type,
        item_type,
        item_id,
        item_name,
        details,
        profiles:admin_id(full_name, email)
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    if (actionType) {
      query = query.eq('action_type', actionType)
    }

    if (itemType) {
      query = query.eq('item_type', itemType)
    }

    if (search) {
      query = query.or(`item_name.ilike.%${search}%,item_id.ilike.%${search}%`)
    }

    const { data: logs, error, count } = await query

    if (error) {
      throw error
    }

    // Transform the response
    const transformedLogs = logs?.map((log: any) => ({
      id: log.id,
      created_at: log.created_at,
      action_type: log.action_type,
      item_type: log.item_type,
      item_id: log.item_id,
      item_name: log.item_name,
      admin_name: log.profiles?.full_name || log.profiles?.email || 'Unknown Admin',
      details: log.details,
    }))

    return NextResponse.json({
      logs: transformedLogs,
      total: count,
      page,
      pageSize,
    })
  } catch (error) {
    console.error('[v0] Error fetching audit logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    )
  }
}
