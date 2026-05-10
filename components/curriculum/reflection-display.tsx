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
 * Inline confirmation message displayed within page content after reflection submission.
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
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-6">
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
        <div className="flex justify-center pt-2">
          {nextHref && (
            <Link href={nextHref}>
              <Button
                variant="default"
                size="lg"
                className="gap-2"
              >
                Go to next item
                <ChevronRight className="h-5 w-5" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
