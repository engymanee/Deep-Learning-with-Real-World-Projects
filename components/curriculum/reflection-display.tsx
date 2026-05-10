'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronRight, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ReflectionDisplayProps {
  reflection: string | null
  contentTitle: string
  nextHref: string | null
  onClear?: () => void
}

/**
 * Bottom panel that displays a confirmation message after reflection submission.
 * Shows a clean confirmation with a link to view the reflection in the
 * Fellow Reflections community space and a button to proceed to next item.
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
          {/* Confirmation message with icon */}
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 shrink-0 text-primary mt-0.5" />
            <div className="flex-1 space-y-1">
              <p className="font-medium text-foreground">
                Your reflection has been saved.
              </p>
              <p className="text-sm text-muted-foreground">
                You can now view it in{' '}
                <Link
                  href="/community/reflections"
                  className="font-medium text-primary hover:underline"
                >
                  Fellow Reflections
                </Link>
                .
              </p>
            </div>
          </div>

          {/* Navigation button */}
          <div className="flex justify-end">
            {nextHref && (
              <Link href={nextHref}>
                <Button
                  variant="default"
                  size="sm"
                  className="gap-2"
                >
                  Go to next item
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
