'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import { TopBar } from './top-bar'
import { Sidebar } from './sidebar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface AppShellProps {
  children: React.ReactNode
  showSidebar?: boolean
  /** ID of the currently-viewed phase, used to highlight the sidebar row. */
  currentYearId?: string
}

export function AppShell({
  children,
  showSidebar = false,
  currentYearId,
}: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-bg">
      <TopBar />

      <div className="flex">
        {showSidebar && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="fixed top-20 left-4 z-30 md:hidden"
              aria-label={sidebarOpen ? 'Close navigation' : 'Open navigation'}
            >
              <Menu className="h-5 w-5" />
            </Button>

            {sidebarOpen && (
              <div
                className="fixed inset-0 z-30 bg-black/50 md:hidden"
                onClick={() => setSidebarOpen(false)}
                aria-hidden="true"
              />
            )}

            <Sidebar
              isOpen={sidebarOpen}
              onClose={() => setSidebarOpen(false)}
              currentYearId={currentYearId}
            />
          </>
        )}

        <main
          className={cn(
            'flex-1 transition-all duration-300',
            showSidebar ? 'md:max-w-[calc(100%-320px)]' : 'w-full',
          )}
        >
          <div
            className={cn(
              'mx-auto px-6 py-8',
              showSidebar ? 'max-w-full' : 'max-w-2xl md:max-w-4xl',
            )}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
