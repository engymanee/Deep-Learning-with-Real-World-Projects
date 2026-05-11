'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Settings, LogOut, User as UserIcon, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useMaybeUser } from '@/lib/user-context'
import { createClient } from '@/lib/supabase/client'
import { roleLabels } from '@/lib/roles'
import { NotificationsBell } from '@/components/notifications/notifications-bell'

export function TopBar() {
  const { user } = useMaybeUser()
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const initials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
    : '?'

  return (
    <header className="sticky top-0 z-50 h-16 bg-primary border-b border-border flex items-center justify-between px-6 shadow-card">
      {/* Left: Wordmark */}
      <Link href="/dashboard" className="flex items-center gap-2">
        <div className="text-2xl font-serif font-bold text-white">
          WaW Fellows Portal
        </div>
      </Link>

      {/* Center: Horizontal Nav */}
      <nav className="hidden md:flex items-center gap-8">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-white/80 hover:text-white transition-colors"
        >
          Dashboard
        </Link>
        <Link
          href="/about"
          className="text-sm font-medium text-white/80 hover:text-white transition-colors"
        >
          About
        </Link>
        <Link
          href="/resources"
          className="text-sm font-medium text-white/80 hover:text-white transition-colors"
        >
          Library
        </Link>
        <Link
          href="/community"
          className="text-sm font-medium text-white/80 hover:text-white transition-colors"
        >
          Community
        </Link>
        {user?.role === 'admin' && (
          <Link
            href="/admin"
            className="text-sm font-medium text-white/80 hover:text-white transition-colors flex items-center gap-1"
          >
            <Shield className="h-4 w-4" />
            Admin
          </Link>
        )}
      </nav>

      {/* Right: notifications bell + user menu. The bell shows an
          unread badge driven by /api/notifications/unread-count and
          links to the full /notifications inbox. */}
      <div className="flex items-center gap-2">
        {user ? <NotificationsBell /> : null}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-primary-light"
              aria-label="User menu"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary-light text-white font-serif">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium text-text">
                {user?.fullName ?? 'Signed out'}
              </p>
              <p className="text-xs text-text-muted">
                {user ? (
                  <>
                    {roleLabels[user.role]}
                    {user.schoolName ? ` · ${user.schoolName}` : ''}
                  </>
                ) : (
                  'No active session'
                )}
              </p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                href="/profile"
                className="flex items-center gap-2 cursor-pointer"
              >
                <UserIcon className="h-4 w-4" />
                <span>Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                href="/settings"
                className="flex items-center gap-2 cursor-pointer"
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>
            {user?.role === 'admin' && (
              <DropdownMenuItem asChild>
                <Link
                  href="/admin"
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Shield className="h-4 w-4" />
                  <span>Admin console</span>
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault()
                handleSignOut()
              }}
              className="flex items-center gap-2 cursor-pointer text-destructive"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
