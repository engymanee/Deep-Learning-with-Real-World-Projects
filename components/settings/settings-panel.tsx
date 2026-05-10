'use client'

import { useState } from 'react'
import { Bell, Lock, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

interface Props {
  userId: string
  userEmail: string
}

export function SettingsPanel({ userId, userEmail }: Props) {
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [communityUpdates, setCommunityUpdates] = useState(true)
  const [weeklyDigest, setWeeklyDigest] = useState(false)

  const handleLogout = async () => {
    await fetch('/auth/logout', { method: 'POST' })
    window.location.href = '/auth/login'
  }

  return (
    <div className="space-y-6">
      {/* Account Section */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Lock className="h-5 w-5 text-foreground" />
          <h2 className="text-lg font-semibold">Account</h2>
        </div>
        <Separator className="mb-6" />

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-muted-foreground">
              Email Address
            </Label>
            <p className="mt-2 text-base font-medium">{userEmail}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Contact support to change your email address
            </p>
          </div>

          <div>
            <Label className="text-sm font-medium text-muted-foreground">
              User ID
            </Label>
            <p className="mt-2 text-sm font-mono text-muted-foreground">
              {userId}
            </p>
          </div>
        </div>
      </Card>

      {/* Notification Preferences */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Bell className="h-5 w-5 text-foreground" />
          <h2 className="text-lg font-semibold">Notifications</h2>
        </div>
        <Separator className="mb-6" />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Email Notifications</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Receive email when someone interacts with your content
              </p>
            </div>
            <Switch
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">
                Community Updates
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Get notified about new wins, asks, and reflections
              </p>
            </div>
            <Switch
              checked={communityUpdates}
              onCheckedChange={setCommunityUpdates}
              disabled={!emailNotifications}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Weekly Digest</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Summary email every Monday morning
              </p>
            </div>
            <Switch
              checked={weeklyDigest}
              onCheckedChange={setWeeklyDigest}
              disabled={!emailNotifications}
            />
          </div>
        </div>
      </Card>

      {/* Session */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <LogOut className="h-5 w-5 text-foreground" />
          <h2 className="text-lg font-semibold">Session</h2>
        </div>
        <Separator className="mb-6" />

        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full sm:w-auto"
        >
          Sign out
        </Button>
        <p className="text-xs text-muted-foreground mt-3">
          You will be signed out of this account on all devices.
        </p>
      </Card>
    </div>
  )
}
