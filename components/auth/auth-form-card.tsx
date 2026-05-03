import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type AuthFormCardProps = {
  title: string
  description?: string
  /** Smaller helper line (e.g. recovery email-link hint). */
  extraDescription?: string
  children: ReactNode
  footer?: ReactNode
  className?: string
}

export function AuthFormCard({
  title,
  description,
  extraDescription,
  children,
  footer,
  className,
}: AuthFormCardProps) {
  return (
    <div className={cn('mx-auto w-full max-w-md', className)}>
      <div className="bg-card shadow-soft rounded-2xl p-8 md:p-9">
        <h1 className="marketing-heading text-foreground text-2xl font-semibold tracking-tight">
          {title}
        </h1>
        {description ? (
          <p className="text-muted-foreground mt-inset text-sm leading-relaxed">{description}</p>
        ) : null}
        {extraDescription ? (
          <p className="text-muted-foreground/90 mt-block text-sm leading-relaxed">
            {extraDescription}
          </p>
        ) : null}
        <div className="mt-layout">{children}</div>
        {footer ? (
          <div className="border-border/60 mt-layout space-y-inset pt-layout border-t">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}
