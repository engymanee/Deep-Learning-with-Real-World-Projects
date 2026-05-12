import { del } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth-server'

export const runtime = 'nodejs'

/**
 * GET /api/admin/custom-pages/images
 * List all uploaded images
 */
export async function GET() {
  try {
    await requireAdmin()
    const supabase = await createClient()

    const { data: images, error } = await supabase
      .from('page_images')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ images: images || [] })
  } catch (error) {
    console.error('[v0] Error fetching images:', error)
    return NextResponse.json(
      { error: 'Failed to fetch images' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/custom-pages/images/[id]
 * Delete an image (handles Vercel Blob cleanup)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()
    const supabase = await createClient()
    const imageId = params.id

    // Get image details
    const { data: image, error: fetchError } = await supabase
      .from('page_images')
      .select('*')
      .eq('id', imageId)
      .single()

    if (fetchError || !image) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      )
    }

    // Check if image is in use
    const { data: usageCount } = await supabase
      .from('page_blocks')
      .select('id', { count: 'exact', head: true })
      .eq('image_id', imageId)

    if (usageCount && usageCount.length > 0) {
      return NextResponse.json(
        { error: 'Image is in use. Remove it from all pages before deleting.' },
        { status: 400 }
      )
    }

    // Delete from Vercel Blob
    try {
      const url = new URL(image.url)
      await del(url)
    } catch (err) {
      console.warn('[v0] Error deleting from Vercel Blob:', err)
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('page_images')
      .delete()
      .eq('id', imageId)

    if (deleteError) throw deleteError

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[v0] Error deleting image:', error)
    return NextResponse.json(
      { error: 'Failed to delete image' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/custom-pages/images/[id]
 * Update image metadata (alt_text)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()
    const supabase = await createClient()
    const imageId = params.id
    const body = await request.json()
    const { alt_text } = body

    const { data: image, error: updateError } = await supabase
      .from('page_images')
      .update({ alt_text })
      .eq('id', imageId)
      .select()
      .single()

    if (updateError) throw updateError

    return NextResponse.json(image)
  } catch (error) {
    console.error('[v0] Error updating image:', error)
    return NextResponse.json(
      { error: 'Failed to update image' },
      { status: 500 }
    )
  }
}
