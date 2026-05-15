import { getCurrentUser } from '@/lib/auth-server'
import { NextResponse } from 'next/server'

/**
 * GET /api/user
 * Returns the current authenticated user
 */
export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(null, { status: 401 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('[v0] Error fetching current user:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    )
  }
}
