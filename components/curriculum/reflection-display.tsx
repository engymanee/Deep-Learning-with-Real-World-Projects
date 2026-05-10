'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ReflectionDisplayProps {
  reflection: string | null
  contentTitle: string
  nextHref: string | null
  onClear?: () => void
}

/**
 * Bottom panel that displays a submitted reflection in real-time.
 * Shows the reflection text with an option to clear it and a "Next Item"
 * navigation button when available.
 */
export function ReflectionDisplay({
  reflection,
  contentTitle,
  nextHref,
  onClear,
}: ReflectionDisplayProps) {
  const [isVisible, setIsVisible] = useState(!!reflection)

  useEffect(() => {
    setIsVisible(!!reflection)
  }, [reflection])

  if (!isVisible || !reflection) {
    return null
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-card shadow-lg animate-in slide-in-from-bottom-4">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4">
          {/* Header with close button */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Your reflection on {contentTitle}
              </p>
              <p className="text-sm text-muted-foreground">
                Successfully submitted to your community journal
              </p>
            </div>
            <button
              onClick={() => {
                setIsVisible(false)
                onClear?.()
              }}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close reflection panel"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Reflection content */}
          <div className="rounded-lg border border-border bg-muted/40 p-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {reflection}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Your reflection is now visible in the community reflections feed
            </p>
            {nextHref && (
              <Link href={nextHref}>
                <Button
                  variant="default"
                  size="sm"
                  className="gap-2"
                >
                  Next Item
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
