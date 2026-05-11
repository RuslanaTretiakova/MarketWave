import type { ComponentType } from 'react'
import Link from 'next/link'
import { ArrowUpRight, TrendingDown } from 'lucide-react'

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
  /** When set, the whole card navigates to this path. */
  href?: string
  /** Accessible name when `href` is set (defaults to label + value). */
  ariaLabel?: string
}

function iconWrapClass(tone: KpiTone): string {
  switch (tone) {
    case 'primary':
      return 'bg-primary-soft text-primary-ink'
    case 'primaryMuted':
      return 'bg-primary-soft/80 text-primary-ink'
    case 'accent':
      return 'bg-accent-soft text-accent'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

function trendPillClass(deltaClassName?: string): string {
  const d = deltaClassName ?? ''
  if (d.includes('destructive')) return 'bg-destructive/10 text-destructive'
  if (d.includes('success')) return 'bg-primary-soft text-primary-ink'
  if (d.includes('accent')) return 'bg-accent-soft text-accent'
  if (d.includes('muted-foreground')) return 'bg-muted text-muted-foreground'
  return 'bg-primary-soft text-primary-ink'
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
  href,
  ariaLabel,
}: KpiCardProps) {
  const iconTone = iconWrapClass(tone)
  const pillClass = trendPillClass(deltaClassName)
  const trendNegative = (deltaClassName ?? '').includes('destructive')
  const TrendGlyph = trendNegative ? TrendingDown : ArrowUpRight

  const card = (
    <Card
      size="sm"
      className={cn(
        'border-border rounded-2xl shadow-none transition-shadow',
        href
          ? 'hover:border-primary/25 h-full cursor-pointer border transition-[box-shadow,border-color] hover:shadow-md'
          : 'hover:shadow-sm'
      )}
    >
      <CardHeader className="gap-2 px-5 py-4 md:px-6 md:py-5">
        <div className="flex items-start justify-between gap-3">
          <CardDescription className="text-muted-foreground font-sans text-[0.7rem] leading-snug font-semibold tracking-wider uppercase">
            {label}
          </CardDescription>
          <span
            className={cn(
              'inline-flex size-9 shrink-0 items-center justify-center rounded-lg',
              iconTone
            )}
            aria-hidden
          >
            <Icon className="size-4 shrink-0" />
          </span>
        </div>
        <CardTitle className="font-heading text-foreground text-2xl leading-none font-semibold tracking-tight tabular-nums md:text-3xl">
          {value}
        </CardTitle>
        {showDelta && delta !== undefined ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-sans text-xs font-semibold tabular-nums',
                pillClass
              )}
            >
              <TrendGlyph className="size-3.5 shrink-0 stroke-[2.25]" aria-hidden />
              {delta}
            </span>
            {deltaLabel ? (
              <span className="text-muted-foreground font-sans text-xs font-normal">
                {deltaLabel}
              </span>
            ) : null}
          </div>
        ) : (
          <div className="min-h-5" aria-hidden />
        )}
      </CardHeader>
    </Card>
  )

  if (href) {
    return (
      <Link
        href={href}
        aria-label={ariaLabel ?? `${label}: ${value}`}
        className={cn(
          'text-foreground block rounded-2xl outline-none',
          'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2'
        )}
      >
        {card}
      </Link>
    )
  }

  return card
}
