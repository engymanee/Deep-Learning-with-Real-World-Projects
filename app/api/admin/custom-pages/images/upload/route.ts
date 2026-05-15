import { put } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth-server'

export const runtime = 'nodejs'

/**
 * POST /api/admin/custom-pages/images/upload
 * Upload an image for custom pages with validation
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin()
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

    console.log('[v0] Uploading image to Vercel Blob:', filename)

    // Upload to Vercel Blob
    let blob
    try {
      const token = process.env.BLOB_READ_WRITE_TOKEN
      if (!token) {
        console.error('[v0] BLOB_READ_WRITE_TOKEN not found in environment')
        return NextResponse.json(
          { error: 'Blob storage token not configured. Contact administrator.' },
          { status: 500 }
        )
      }

      blob = await put(filename, file, {
        access: 'private',
        contentType: file.type,
        token,
      })
    } catch (blobError) {
      console.error('[v0] Blob upload failed:', blobError)
      return NextResponse.json(
        { error: 'Failed to upload to blob storage. Check BLOB_READ_WRITE_TOKEN env var.' },
        { status: 500 }
      )
    }

    console.log('[v0] Image uploaded to Blob:', blob.url)

    // Log to database
    console.log('[v0] Logging image to database...')
    
    // Build insert object with only the most essential fields first
    const imageData: any = {
      url: blob.url,
    }
    
    // Try to add optional fields, catching if columns don't exist
    try {
      imageData.filename = file.name
      imageData.size_bytes = file.size
      imageData.mime_type = file.type
    } catch (e) {
      // Fields might not exist in schema yet
    }

    const { data: imageRecord, error: dbError } = await supabase
      .from('page_images')
      .insert(imageData)
      .select()
      .single()

    if (dbError) {
      console.error('[v0] Error logging image to database:', dbError)
      // If we can't log to DB, at least return the blob URL
      return NextResponse.json({
        id: `temp-${timestamp}`,
        url: blob.url,
        filename: file.name,
        width: null,
        height: null,
        size_bytes: file.size,
        warning: 'Image uploaded but database logging failed',
      })
    }

    console.log('[v0] Image record created:', imageRecord.id)

    return NextResponse.json({
      id: imageRecord.id,
      url: imageRecord.url,
      filename: imageRecord?.filename || file.name,
      width: imageRecord?.width || null,
      height: imageRecord?.height || null,
      size_bytes: imageRecord?.size_bytes || file.size,
    })
  } catch (error) {
    console.error('[v0] Image upload error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    )
  }
}

