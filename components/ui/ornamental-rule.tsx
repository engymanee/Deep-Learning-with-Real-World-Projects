import React from 'react'
import { cn } from '@/lib/utils'

interface OrnamentalRuleProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'dots' | 'diamond'
}

export function OrnamentalRule({
  variant = 'dots',
  className,
  ...props
}: OrnamentalRuleProps) {
  return (
    <div
      className={cn(
        'ornamental-rule flex items-center justify-center my-6 text-[var(--color-crimson)]',
        className
      )}
      {...props}
    >
      {variant === 'dots' ? (
        <>
          <span className="text-lg">•</span>
          <div className="flex-1 h-px bg-[var(--color-crimson)] opacity-50" />
          <span className="text-lg">◆</span>
          <div className="flex-1 h-px bg-[var(--color-crimson)] opacity-50" />
          <span className="text-lg">•</span>
        </>
      ) : (
        <>
          <div className="flex-1 h-px bg-[var(--color-crimson)] opacity-50" />
          <span className="mx-4 text-lg">◆</span>
          <div className="flex-1 h-px bg-[var(--color-crimson)] opacity-50" />
        </>
      )}
    </div>
  )
}
