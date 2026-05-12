import { put } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth-server'

export const runtime = 'nodejs'

/**
 * POST /api/admin/custom-pages/images/upload
 * Upload an image for custom pages with validation and metadata extraction
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    const supabase = await createClient()

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validation
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Maximum size is 5MB, got ${(file.size / 1024 / 1024).toFixed(1)}MB` },
        { status: 400 }
      )
    }

    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedMimes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF' },
        { status: 400 }
      )
    }

    // Generate unique filename
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const ext = file.name.split('.').pop() || 'jpg'
    const filename = `custom-pages/${timestamp}-${random}.${ext}`

    // Upload to Vercel Blob
    const blob = await put(filename, file, {
      access: 'public',
      contentType: file.type,
    })

    // Get image dimensions
    let width: number | null = null
    let height: number | null = null

    try {
      const img = new Image()
      const buffer = await file.arrayBuffer()
      const base64 = Buffer.from(buffer).toString('base64')
      img.src = `data:${file.type};base64,${base64}`

      // Wait for image to load
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        // Timeout after 5s
        setTimeout(() => reject(new Error('Image load timeout')), 5000)
      })

      width = img.width
      height = img.height
    } catch (err) {
      console.log('[v0] Could not extract image dimensions:', err)
    }

    // Log to database
    const { data: imageRecord, error: dbError } = await supabase
      .from('page_images')
      .insert({
        url: blob.url,
        filename: file.name,
        size_bytes: file.size,
        mime_type: file.type,
        width,
        height,
        alt_text: '',
        uploaded_by: (await requireAdmin()).id,
      })
      .select()
      .single()

    if (dbError) {
      console.error('[v0] Error logging image to database:', dbError)
      return NextResponse.json(
        { error: 'Failed to log image metadata' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      id: imageRecord.id,
      url: imageRecord.url,
      filename: imageRecord.filename,
      width: imageRecord.width,
      height: imageRecord.height,
      size_bytes: imageRecord.size_bytes,
    })
  } catch (error) {
    console.error('[v0] Image upload error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    )
  }
}
