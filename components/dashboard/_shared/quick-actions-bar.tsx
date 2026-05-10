import Link from 'next/link'
import type { ComponentType } from 'react'

import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type QuickActionVariant = 'default' | 'outline' | 'ghost'

export type QuickAction = {
  href?: string
  label: string
  icon: ComponentType<{ className?: string }>
  variant?: QuickActionVariant
  /** Disables the button (renders as a non-link Button); used for "coming soon" placeholders. */
  disabled?: boolean
  /** Tooltip / native title attribute. */
  title?: string
}

export function QuickActionsBar({
  actions,
  className,
}: {
  actions: QuickAction[]
  className?: string
}) {
  return (
    <div className={cn('gap-inset flex flex-wrap items-center', className)}>
      {actions.map((action) => {
        const variant = action.variant ?? 'outline'
        const Icon = action.icon

        if (action.disabled || !action.href) {
          return (
            <Button
              key={action.label}
              type="button"
              variant={variant === 'default' ? 'default' : variant}
              size="default"
              disabled={action.disabled}
              title={action.title}
              className={cn(
                'rounded-xl',
                variant === 'outline' && 'border-border',
                action.disabled && 'text-muted-foreground'
              )}
            >
              <Icon className="size-4" aria-hidden />
              {action.label}
            </Button>
          )
        }

        return (
          <Link
            key={action.label}
            href={action.href}
            title={action.title}
            className={cn(
              buttonVariants({ variant, size: 'default' }),
              'rounded-xl',
              variant === 'outline' && 'border-border'
            )}
          >
            <Icon className="size-4" aria-hidden />
            {action.label}
          </Link>
        )
      })}
    </div>
  )
}
