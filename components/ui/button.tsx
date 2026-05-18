import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-navy)] focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default: 'bg-[var(--color-navy)] text-[var(--color-paper)] hover:bg-[#1d3d66] transition-colors',
        primary: 'bg-[var(--color-navy)] text-[var(--color-paper)] hover:bg-[#1d3d66] transition-colors',
        secondary:
          'bg-transparent border border-[var(--color-navy)] text-[var(--color-navy)] hover:bg-[var(--color-navy-tint)] transition-colors',
        outline:
          'bg-transparent border border-[var(--color-navy)] text-[var(--color-navy)] hover:bg-[var(--color-navy-tint)] transition-colors',
        ghost:
          'bg-transparent text-[var(--color-navy)] hover:bg-[var(--color-navy-tint)] transition-colors',
        accent: 'bg-[var(--color-crimson)] text-[var(--color-paper)] rounded-full px-5 hover:bg-[#a33d4a] transition-colors',
        destructive:
          'bg-[var(--color-error)] text-[var(--color-paper)] hover:bg-[#8a2f2f] transition-colors',
        link: 'text-[var(--color-navy)] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-5 py-2',
        sm: 'h-9 px-4 text-sm',
        lg: 'h-11 px-6 text-base',
        icon: 'size-10',
        'icon-sm': 'size-9',
        'icon-lg': 'size-12',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
