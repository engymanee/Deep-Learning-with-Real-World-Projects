import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/custom-pages
 * List published custom pages, optionally filtered for menu display
 * Cache is kept short (10 seconds) to ensure quick updates when pages are published
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const url = new URL(request.url)
    const menuOnly = url.searchParams.get('menu') === 'true'

    let query = supabase
      .from('custom_pages')
      .select(`
        id,
        title,
        slug,
        description,
        header1,
        header2,
        header3,
        is_published,
        show_in_menu,
        created_by,
        created_at,
        updated_at
      `)
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

    // Set cache headers: revalidate every 10 seconds to ensure updates appear quickly
    const response = NextResponse.json(pages || [])
    response.headers.set('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=30')
    return response
  } catch (error) {
    console.error('[v0] Error in custom pages API:', error)
    return NextResponse.json([])
  }
}
