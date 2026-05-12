'use client'

import { useState } from 'react'
import { ReflectionForm } from './reflection-form'
import { ReflectionDisplay } from './reflection-display'

interface ReflectionWithDisplayProps {
  contentId: string
  contentTitle: string
  prompt: string
  initialResponse: string | null
  nextHref: string | null
}

/**
 * Combines ReflectionForm with ReflectionDisplay for a complete
 * reflection submission experience. After submission, displays the
 * reflection in a floating bottom panel with navigation to next item.
 */
export function ReflectionWithDisplay({
  contentId,
  contentTitle,
  prompt,
  initialResponse,
  nextHref,
}: ReflectionWithDisplayProps) {
  const [displayedReflection, setDisplayedReflection] = useState<string | null>(
    initialResponse,
  )

  // When reflection form successfully submits, it calls router.refresh()
  // which re-renders this component with the new initialResponse.
  // We track displayed reflection separately to show the panel.
  const handleFormSuccess = (response: string) => {
    setDisplayedReflection(response)
  }

  return (
    <>
      <ReflectionForm
        contentId={contentId}
        prompt={prompt}
        initialResponse={initialResponse}
      />
      <ReflectionDisplay
        reflection={displayedReflection}
        contentTitle={contentTitle}
        nextHref={nextHref}
        onClear={() => setDisplayedReflection(null)}
      />
    </>
  )
}
