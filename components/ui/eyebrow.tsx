import React from 'react'
import { cn } from '@/lib/utils'

interface EyebrowProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  color?: 'crimson' | 'navy-muted'
}

export function Eyebrow({
  children,
  color = 'navy-muted',
  className,
  ...props
}: EyebrowProps) {
  return (
    <div
      className={cn(
        'text-eyebrow',
        color === 'crimson' ? 'text-[var(--color-crimson)]' : 'text-[var(--color-navy-muted)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
