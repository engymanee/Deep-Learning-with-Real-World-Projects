import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth-server'

export const runtime = 'nodejs'

/**
 * POST /api/admin/custom-pages
 * Create a new custom page
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin()
    const supabase = await createClient()
    const body = await request.json()

    const { title, slug, description, blocks } = body

    if (!title || !slug) {
      return NextResponse.json(
        { error: 'Title and slug are required' },
        { status: 400 }
      )
    }

    // Create the page
    const { data: page, error: pageError } = await supabase
      .from('custom_pages')
      .insert({
        title,
        slug,
        description: description || null,
        is_published: false,
        created_by: user.id,
      })
      .select()
      .single()

    if (pageError) {
      console.error('[v0] Error creating page:', pageError)
      return NextResponse.json(
        { error: pageError.message || 'Failed to create page' },
        { status: 500 }
      )
    }

    // Add blocks if provided
    if (blocks && blocks.length > 0) {
      const { error: blocksError } = await supabase
        .from('page_blocks')
        .insert(
          blocks.map((block: any, index: number) => ({
            page_id: page.id,
            block_type: block.block_type,
            title: block.title || null,
            content: block.content || null,
            metadata: block.metadata || null,
            image_id: block.image_id || null,
            order_number: index,
          }))
        )

      if (blocksError) {
        console.error('[v0] Error creating blocks:', blocksError)
      }
    }

    return NextResponse.json(page)
  } catch (error) {
    console.error('[v0] Page creation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create page' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/custom-pages
 * Update an existing custom page
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAdmin()
    const supabase = await createClient()
    const body = await request.json()

    const { pageId, title, slug, description, is_published, blocks } = body

    if (!pageId) {
      return NextResponse.json(
        { error: 'Page ID is required' },
        { status: 400 }
      )
    }

    // Update the page
    const { data: page, error: pageError } = await supabase
      .from('custom_pages')
      .update({
        title,
        slug,
        description: description || null,
        is_published,
        updated_at: new Date().toISOString(),
      })
      .eq('id', pageId)
      .select()
      .single()

    if (pageError) {
      console.error('[v0] Error updating page:', pageError)
      return NextResponse.json(
        { error: pageError.message || 'Failed to update page' },
        { status: 500 }
      )
    }

    // Update blocks if provided
    if (blocks && blocks.length > 0) {
      // Delete existing blocks
      await supabase.from('page_blocks').delete().eq('page_id', pageId)

      // Insert new blocks
      const { error: blocksError } = await supabase
        .from('page_blocks')
        .insert(
          blocks.map((block: any, index: number) => ({
            page_id: pageId,
            block_type: block.block_type,
            title: block.title || null,
            content: block.content || null,
            metadata: block.metadata || null,
            image_id: block.image_id || null,
            order_number: index,
          }))
        )

      if (blocksError) {
        console.error('[v0] Error updating blocks:', blocksError)
      }
    }

    return NextResponse.json(page)
  } catch (error) {
    console.error('[v0] Page update error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update page' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/custom-pages?pageId=xxx
 * Fetch a specific page with its blocks
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAdmin()
    const supabase = await createClient()
    const pageId = request.nextUrl.searchParams.get('pageId')

    if (!pageId) {
      return NextResponse.json(
        { error: 'Page ID is required' },
        { status: 400 }
      )
    }

    const { data: page, error: pageError } = await supabase
      .from('custom_pages')
      .select(
        `
        *,
        page_blocks (
          id,
          page_id,
          block_type,
          order_number,
          title,
          content,
          metadata,
          image_id
        )
      `
      )
      .eq('id', pageId)
      .single()

    if (pageError) {
      console.error('[v0] Error fetching page:', pageError)
      return NextResponse.json(
        { error: 'Page not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(page)
  } catch (error) {
    console.error('[v0] Page fetch error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch page' },
      { status: 500 }
    )
  }
}
