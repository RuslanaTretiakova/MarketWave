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
    <div
      className={cn(
        'gap-block flex flex-col items-start md:flex-row md:items-center md:justify-between',
        className
      )}
    >
      <div className="min-w-0">
        <h2 className="text-foreground text-xl font-semibold tracking-tight sm:text-2xl">
          {title}
        </h2>
        {description && (
          <p className="text-muted-foreground mt-inset text-sm leading-relaxed">{description}</p>
        )}
        {meta && <div className="mt-inset">{meta}</div>}
      </div>
      {action && <div className="w-full shrink-0 md:w-auto">{action}</div>}
    </div>
  )
}
