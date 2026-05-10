'use client'

import type { ComponentProps } from 'react'
import { MoreHorizontal } from 'lucide-react'

import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function TableRowActionsTrigger({
  label,
  disabled,
  className,
  ...props
}: Omit<ComponentProps<'button'>, 'children'> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      className={cn(
        buttonVariants({ variant: 'ghost', size: 'icon' }),
        'rounded-full opacity-80 hover:opacity-100',
        className
      )}
      {...props}
    >
      <MoreHorizontal className="size-4" aria-hidden />
    </button>
  )
}
