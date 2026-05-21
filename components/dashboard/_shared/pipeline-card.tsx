import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export type PipelineStage = {
  /** Stable key for React, also used as URL slug if needed. */
  key: string
  label: string
  count: number
}

export function PipelineCard({
  title,
  description,
  stages,
  pipelineMax,
  link,
  /** sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 etc. — defaults to a 6-up grid suitable for orders. */
  gridClassName = 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
}: {
  title: string
  description?: string
  stages: PipelineStage[]
  pipelineMax: number
  link?: { href: string; label: string }
  gridClassName?: string
}) {
  const safeMax = Math.max(1, pipelineMax)
  return (
    <Card className="border-border rounded-2xl shadow-none">
      <CardHeader className="gap-inset border-border pb-section [.border-b]:pb-section border-b">
        <div className="gap-block flex flex-wrap items-start justify-between">
          <div>
            <CardTitle className="font-heading text-xl tracking-tight md:text-2xl">
              {title}
            </CardTitle>
            {description ? (
              <CardDescription className="font-sans text-sm">{description}</CardDescription>
            ) : null}
          </div>
          {link ? (
            <Link
              href={link.href}
              className="text-primary inline-flex items-center gap-1 font-sans text-sm font-medium hover:underline"
            >
              {link.label}
              <ArrowUpRight className="size-4" aria-hidden />
            </Link>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="pt-section">
        <div className={cn('gap-block grid', gridClassName)}>
          {stages.map((stage) => (
            <div
              key={stage.key}
              className="border-border bg-muted/15 gap-inset p-block relative flex flex-col overflow-hidden rounded-xl border"
            >
              <div className="gap-inset flex items-center justify-between">
                <span className="text-muted-foreground font-sans text-[0.65rem] font-semibold tracking-wider uppercase">
                  {stage.label}
                </span>
                <span className="bg-primary/15 text-primary-ink rounded-full px-2 py-0.5 font-sans text-xs font-semibold tabular-nums">
                  {stage.count}
                </span>
              </div>
              <p className="text-foreground font-sans text-2xl font-semibold tabular-nums">
                {stage.count}
              </p>
              <div className="bg-muted mt-auto h-1.5 w-full overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full rounded-full transition-[width]"
                  style={{ width: `${(stage.count / safeMax) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
