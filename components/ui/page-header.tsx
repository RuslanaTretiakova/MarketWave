import * as React from 'react'

import { cn } from '@/lib/utils'

export function PageHeader({
  title,
  description,
  meta,
  action,
  className,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  /** Below-title slot for status badges, chips, prices, etc. */
  meta?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('gap-block flex items-start justify-between', className)}>
      <div>
        <h2 className="text-foreground text-2xl font-semibold tracking-tight">{title}</h2>
        {description && (
          <p className="text-muted-foreground mt-inset text-sm leading-relaxed">{description}</p>
        )}
        {meta && <div className="mt-inset">{meta}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
