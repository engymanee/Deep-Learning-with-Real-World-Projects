import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { getUnreadNotificationCount } from '@/lib/notifications/feed'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Tiny endpoint for the top-bar bell badge. Returns 0 when the user
 * is unauthenticated so the client can render a quiet state instead
 * of showing an error.
 */
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ count: 0 })
    const count = await getUnreadNotificationCount(user.id)
    return NextResponse.json({ count })
  } catch {
    return NextResponse.json({ count: 0 })
  }
}
