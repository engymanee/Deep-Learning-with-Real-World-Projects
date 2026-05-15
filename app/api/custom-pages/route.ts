import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/custom-pages
 * List published custom pages, optionally filtered for menu display
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const url = new URL(request.url)
    const menuOnly = url.searchParams.get('menu') === 'true'

    let query = supabase
      .from('custom_pages')
      .select('id, title, slug, description, is_published, show_in_menu, created_at')
      .eq('is_published', true)

    // Filter by show_in_menu if requested
    if (menuOnly) {
      query = query.eq('show_in_menu', true)
    }

    const { data: pages, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('[v0] Error fetching custom pages:', error)
      return NextResponse.json([])
    }

    return NextResponse.json(pages || [])
  } catch (error) {
    console.error('[v0] Error in custom pages API:', error)
    return NextResponse.json([])
  }
}
