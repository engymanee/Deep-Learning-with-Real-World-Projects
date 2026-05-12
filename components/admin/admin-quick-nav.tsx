'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AdminQuickNavProps {
  /** Href to navigate back to (usually the parent list page) */
  backHref?: string
  /** Custom label for back button */
  backLabel?: string
  /** Show home button */
  showHome?: boolean
}

export function AdminQuickNav({
  backHref,
  backLabel = 'Back',
  showHome = true,
}: AdminQuickNavProps) {
  const router = useRouter()

  return (
    <div className="flex items-center gap-2 mb-6">
      {showHome && (
        <Link href="/admin">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            title="Back to Dashboard"
          >
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Button>
        </Link>
      )}

      {backHref && (
        <Link href={backHref}>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{backLabel}</span>
          </Button>
        </Link>
      )}
    </div>
  )
}
