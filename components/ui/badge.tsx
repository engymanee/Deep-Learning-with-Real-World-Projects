import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-sm px-2 py-1 text-xs font-inter font-normal w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none transition-colors',
  {
    variants: {
      variant: {
        quiet:
          'bg-[var(--color-navy-tint)] text-[var(--color-navy)] [a&]:hover:bg-[var(--color-navy-tint)]/80',
        active:
          'bg-[var(--color-crimson-soft)] text-[var(--color-crimson)] [a&]:hover:bg-[var(--color-crimson-soft)]/80',
        secondary:
          'bg-[var(--color-navy-tint)] text-[var(--color-navy-muted)] [a&]:hover:bg-[var(--color-navy-tint)]/80',
        default:
          'bg-[var(--color-navy)] text-[var(--color-paper)] [a&]:hover:bg-[var(--color-navy)]/90',
        outline:
          'border border-[var(--color-navy)] text-[var(--color-navy)] bg-transparent [a&]:hover:bg-[var(--color-navy-tint)]',
        destructive:
          'bg-[var(--color-error)]/10 text-[var(--color-error)] [a&]:hover:bg-[var(--color-error)]/20',
        success:
          'bg-[var(--color-success)]/10 text-[var(--color-success)] [a&]:hover:bg-[var(--color-success)]/20',
        warning:
          'bg-[var(--color-warning)]/10 text-[var(--color-warning)] [a&]:hover:bg-[var(--color-warning)]/20',
        error:
          'bg-[var(--color-error)]/10 text-[var(--color-error)] [a&]:hover:bg-[var(--color-error)]/20',
      },
    },
    defaultVariants: {
      variant: 'quiet',
    },
  },
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'span'

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
