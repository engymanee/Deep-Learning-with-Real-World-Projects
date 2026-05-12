'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Settings, LogOut, User as UserIcon, Shield, Edit2, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  const [editingLabel, setEditingLabel] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>('')
  const [labels, setLabels] = useState({
    dashboard: 'Dashboard',
    about: 'About',
    library: 'Library',
    community: 'Community',
  })
  const [isLoading, setIsLoading] = useState(true)

  // Load labels from API on mount
  useEffect(() => {
    const loadLabels = async () => {
      try {
        console.log('[v0] Loading navigation labels...')
        const response = await fetch('/api/admin/navigation-labels')
        console.log('[v0] Navigation labels response:', response.status)
        if (response.ok) {
          const data = await response.json()
          console.log('[v0] Loaded labels:', data)
          setLabels({
            dashboard: data.dashboard || 'Dashboard',
            about: data.about || 'About',
            library: data.library || 'Library',
            community: data.community || 'Community',
          })
        }
      } catch (error) {
        console.error('[v0] Error loading navigation labels:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadLabels()
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const handleEditStart = (key: string, currentLabel: string) => {
    setEditingLabel(key)
    setEditValue(currentLabel)
  }

  const handleEditSave = async (key: string) => {
    if (!editValue.trim()) {
      setEditingLabel(null)
      return
    }

    const newLabels = {
      ...labels,
      [key]: editValue.trim(),
    }

    try {
      console.log('[v0] Saving navigation label:', key, editValue)
      const response = await fetch('/api/admin/navigation-labels', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLabels),
      })

      console.log('[v0] Save response:', response.status)
      if (response.ok) {
        const data = await response.json()
        console.log('[v0] Saved successfully:', data)
        setLabels(newLabels)
      } else {
        console.error('[v0] Failed to save navigation label')
      }
    } catch (error) {
      console.error('[v0] Error saving navigation label:', error)
    }

    setEditingLabel(null)
    setEditValue('')
  }

  const handleEditCancel = () => {
    setEditingLabel(null)
    setEditValue('')
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
        <div className="relative group">
          {editingLabel === 'dashboard' ? (
            <div className="flex items-center gap-1">
              <Input
                autoFocus
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="h-8 px-2 text-sm w-24"
              />
              <button
                onClick={() => handleEditSave('dashboard')}
                className="p-1 hover:bg-primary-light rounded"
              >
                <Check className="h-4 w-4 text-green-300" />
              </button>
              <button
                onClick={handleEditCancel}
                className="p-1 hover:bg-primary-light rounded"
              >
                <X className="h-4 w-4 text-red-300" />
              </button>
            </div>
          ) : (
            <Link
              href="/dashboard"
              className="text-sm font-medium text-white/80 hover:text-white transition-colors flex items-center gap-1 group/nav"
            >
              {labels.dashboard}
              {user?.role === 'admin' && (
                <button
                  onClick={() => handleEditStart('dashboard', labels.dashboard)}
                  className="opacity-0 group-hover/nav:opacity-100 hover:bg-primary-light p-0.5 rounded transition-opacity"
                >
                  <Edit2 className="h-3 w-3" />
                </button>
              )}
            </Link>
          )}
        </div>

        <div className="relative group">
          {editingLabel === 'about' ? (
            <div className="flex items-center gap-1">
              <Input
                autoFocus
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="h-8 px-2 text-sm w-20"
              />
              <button
                onClick={() => handleEditSave('about')}
                className="p-1 hover:bg-primary-light rounded"
              >
                <Check className="h-4 w-4 text-green-300" />
              </button>
              <button
                onClick={handleEditCancel}
                className="p-1 hover:bg-primary-light rounded"
              >
                <X className="h-4 w-4 text-red-300" />
              </button>
            </div>
          ) : (
            <Link
              href="/about"
              className="text-sm font-medium text-white/80 hover:text-white transition-colors flex items-center gap-1 group/nav"
            >
              {labels.about}
              {user?.role === 'admin' && (
                <button
                  onClick={() => handleEditStart('about', labels.about)}
                  className="opacity-0 group-hover/nav:opacity-100 hover:bg-primary-light p-0.5 rounded transition-opacity"
                >
                  <Edit2 className="h-3 w-3" />
                </button>
              )}
            </Link>
          )}
        </div>

        <div className="relative group">
          {editingLabel === 'library' ? (
            <div className="flex items-center gap-1">
              <Input
                autoFocus
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="h-8 px-2 text-sm w-24"
              />
              <button
                onClick={() => handleEditSave('library')}
                className="p-1 hover:bg-primary-light rounded"
              >
                <Check className="h-4 w-4 text-green-300" />
              </button>
              <button
                onClick={handleEditCancel}
                className="p-1 hover:bg-primary-light rounded"
              >
                <X className="h-4 w-4 text-red-300" />
              </button>
            </div>
          ) : (
            <Link
              href="/resources"
              className="text-sm font-medium text-white/80 hover:text-white transition-colors flex items-center gap-1 group/nav"
            >
              {labels.library}
              {user?.role === 'admin' && (
                <button
                  onClick={() => handleEditStart('library', labels.library)}
                  className="opacity-0 group-hover/nav:opacity-100 hover:bg-primary-light p-0.5 rounded transition-opacity"
                >
                  <Edit2 className="h-3 w-3" />
                </button>
              )}
            </Link>
          )}
        </div>

        <div className="relative group">
          {editingLabel === 'community' ? (
            <div className="flex items-center gap-1">
              <Input
                autoFocus
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="h-8 px-2 text-sm w-24"
              />
              <button
                onClick={() => handleEditSave('community')}
                className="p-1 hover:bg-primary-light rounded"
              >
                <Check className="h-4 w-4 text-green-300" />
              </button>
              <button
                onClick={handleEditCancel}
                className="p-1 hover:bg-primary-light rounded"
              >
                <X className="h-4 w-4 text-red-300" />
              </button>
            </div>
          ) : (
            <Link
              href="/community"
              className="text-sm font-medium text-white/80 hover:text-white transition-colors flex items-center gap-1 group/nav"
            >
              {labels.community}
              {user?.role === 'admin' && (
                <button
                  onClick={() => handleEditStart('community', labels.community)}
                  className="opacity-0 group-hover/nav:opacity-100 hover:bg-primary-light p-0.5 rounded transition-opacity"
                >
                  <Edit2 className="h-3 w-3" />
                </button>
              )}
            </Link>
          )}
        </div>

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
