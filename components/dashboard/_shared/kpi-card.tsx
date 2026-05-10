import type { ComponentType } from 'react'
import { TrendingUp } from 'lucide-react'

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export type KpiTone = 'primary' | 'primaryMuted' | 'muted' | 'accent'

export type KpiCardProps = {
  label: string
  value: string
  icon: ComponentType<{ className?: string }>
  delta?: string
  deltaLabel?: string
  /** Tailwind classes for the delta row (trend color) */
  deltaClassName?: string
  showDelta?: boolean
  tone?: KpiTone
}

export function KpiCard({
  label,
  value,
  icon: Icon,
  delta,
  deltaLabel,
  deltaClassName,
  showDelta = false,
  tone = 'primary',
}: KpiCardProps) {
  const toneDot =
    tone === 'primary'
      ? 'bg-primary'
      : tone === 'primaryMuted'
        ? 'bg-primary/60'
        : tone === 'accent'
          ? 'bg-accent'
          : 'bg-muted-foreground/40'

  const iconTone =
    tone === 'primary'
      ? 'bg-primary-soft text-primary-ink'
      : tone === 'primaryMuted'
        ? 'bg-primary-soft/70 text-primary-ink'
        : tone === 'accent'
          ? 'bg-accent-soft text-accent'
          : 'bg-muted text-muted-foreground'

  return (
    <Card
      size="sm"
      className="border-border rounded-2xl shadow-none transition-shadow hover:shadow-sm"
    >
      <CardHeader className="gap-2 px-4 py-4 md:px-5 md:py-5">
        <div className="gap-inset flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span
              className={cn('inline-flex size-1.5 shrink-0 rounded-full', toneDot)}
              aria-hidden
            />
            <CardDescription className="text-muted-foreground font-sans text-[0.72rem] font-semibold tracking-wider uppercase">
              {label}
            </CardDescription>
          </div>
          <span
            className={cn('inline-flex size-8 items-center justify-center rounded-full', iconTone)}
          >
            <Icon className="size-4.5 shrink-0" aria-hidden />
          </span>
        </div>
        <CardTitle className="font-heading text-foreground text-4xl font-semibold tracking-tight tabular-nums">
          {value}
        </CardTitle>
        {showDelta && delta !== undefined ? (
          <p
            className={cn(
              'flex items-center gap-1.5 font-sans text-sm font-medium',
              deltaClassName ?? 'text-success'
            )}
          >
            <TrendingUp className="size-4" aria-hidden />
            <span>{delta}</span>
            {deltaLabel ? (
              <span className="text-muted-foreground font-normal">{deltaLabel}</span>
            ) : null}
          </p>
        ) : (
          <p className="text-muted-foreground min-h-5 font-sans text-sm"> </p>
        )}
      </CardHeader>
    </Card>
  )
}
