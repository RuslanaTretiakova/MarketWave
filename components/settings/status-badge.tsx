'use client'

import { cn } from '@/lib/utils'

export function StatusBadge({
  status,
  className,
}: {
  status: 'active' | 'invited' | 'disabled'
  className?: string
}) {
  if (status === 'active') {
    return (
      <span className={cn('text-foreground inline-flex items-center gap-1.5 text-sm', className)}>
        <span className="size-2 shrink-0 rounded-full bg-emerald-500" aria-hidden />
        Active
      </span>
    )
  }
  if (status === 'invited') {
    return (
      <span className={cn('text-foreground inline-flex items-center gap-1.5 text-sm', className)}>
        <span className="size-2 shrink-0 rounded-full bg-amber-500" aria-hidden />
        Invited
      </span>
    )
  }
  return (
    <span className={cn('text-foreground inline-flex items-center gap-1.5 text-sm', className)}>
      <span className="bg-muted-foreground/80 size-2 shrink-0 rounded-full" aria-hidden />
      Disabled
    </span>
  )
}
