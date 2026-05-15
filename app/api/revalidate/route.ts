import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'

export async function POST(request: NextRequest) {
  try {
    const { slug } = await request.json()

    if (!slug) {
      return NextResponse.json(
        { error: 'Slug is required' },
        { status: 400 }
      )
    }

    // Revalidate the specific page route
    revalidateTag(`page-${slug}`, 'hours')

    return NextResponse.json({ revalidated: true })
  } catch (error) {
    console.error('[v0] Revalidate error:', error)
    return NextResponse.json(
      { error: 'Failed to revalidate' },
      { status: 500 }
    )
  }
}
