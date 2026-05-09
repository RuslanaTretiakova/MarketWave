import Link from 'next/link'
import type { ComponentType } from 'react'
import {
  ArrowUpRight,
  CheckCircle2,
  CircleCheck,
  Clock,
  ExternalLink,
  Globe,
  Mail,
  Plus,
  Search,
  Target,
  TrendingUp,
  Upload,
} from 'lucide-react'

import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { SourcerDashboardData } from '@/lib/dashboard/load-sourcer-dashboard'
import { SITE_STATUS_CHIP, SITE_STATUS_LABEL } from '@/lib/sites/site-status-labels'
import { cn } from '@/lib/utils'

function safePublicSiteUrl(domain: string): string | null {
  const d = domain.trim()
  if (!d || d.length > 253) return null
  if (
    !/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/.test(d)
  )
    return null
  return `https://${d}`
}

type KpiTone = 'primary' | 'primaryMuted' | 'muted' | 'accent'

function KpiCard({
  label,
  value,
  icon: Icon,
  delta,
  deltaLabel,
  deltaClassName,
  showDelta,
  tone,
}: {
  label: string
  value: string
  icon: ComponentType<{ className?: string }>
  delta?: string
  deltaLabel?: string
  /** Tailwind classes for the delta row (trend color) */
  deltaClassName?: string
  showDelta: boolean
  tone: KpiTone
}) {
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

function WeeklyTrendChart({ counts }: { counts: number[] }) {
  const max = Math.max(1, ...counts)
  const total = counts.reduce((a, b) => a + b, 0)
  if (total === 0) {
    return (
      <div className="text-muted-foreground gap-inset bg-muted/30 px-block py-section flex min-h-36 flex-col items-center justify-center rounded-xl border border-dashed text-center text-sm">
        <TrendingUp className="text-muted-foreground/50 size-8" aria-hidden />
        <p>No submissions in the last 12 weeks.</p>
        <p className="text-muted-foreground max-w-xs text-xs leading-relaxed">
          New catalog submissions will appear here over time.
        </p>
      </div>
    )
  }

  return (
    <div className="px-inset pt-section flex min-h-36 items-end gap-1">
      {counts.map((n, i) => (
        <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <div
            className="bg-primary/85 mx-auto w-full max-w-[22px] rounded-t-sm"
            style={{ height: `${Math.max(8, (n / max) * 120)}px` }}
            title={`Week ${i + 1}: ${n}`}
          />
          {i === 0 || i === 5 || i === 11 ? (
            <span className="text-muted-foreground font-mono text-[0.65rem] tabular-nums">
              W{i + 1}
            </span>
          ) : (
            <span className="text-muted-foreground font-mono text-[0.65rem] opacity-0">·</span>
          )}
        </div>
      ))}
    </div>
  )
}

export function SourcerDashboard({
  data,
}: {
  data: SourcerDashboardData
  greetingName: string | null
}) {
  const submittedDeltaShow = data.submittedPrevMonth > 0
  const submittedDeltaText =
    data.submittedMonthDelta === 0
      ? '0'
      : data.submittedMonthDelta > 0
        ? `+${data.submittedMonthDelta}`
        : `${data.submittedMonthDelta}`

  const approvalDeltaShow =
    data.approvalRateDeltaPoints !== null && data.approvalRateDeltaPoints !== 0

  return (
    <div className="gap-layout mx-auto flex max-w-6xl flex-col">
      <div className="gap-inset flex flex-col">
        <h1 className="font-heading text-foreground text-3xl font-semibold tracking-tight md:text-4xl">
          Sourcing status overview
        </h1>
        <p className="text-muted-foreground max-w-xl font-sans text-sm leading-relaxed">
          Check submission volume, review queue, and listing outcomes at a glance.
        </p>
      </div>

      <div className="gap-block grid sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Sites submitted (mo)"
          value={String(data.submittedThisMonth)}
          icon={Upload}
          showDelta={submittedDeltaShow}
          delta={submittedDeltaText}
          deltaLabel="vs last month"
          deltaClassName={
            data.submittedMonthDelta > 0
              ? 'text-success'
              : data.submittedMonthDelta < 0
                ? 'text-destructive'
                : 'text-muted-foreground'
          }
          tone="primary"
        />
        <KpiCard
          label="Live listings"
          value={String(data.sitesActive)}
          icon={CheckCircle2}
          showDelta={false}
          tone="primaryMuted"
        />
        <KpiCard
          label="Awaiting review"
          value={String(data.sitesPendingReview)}
          icon={Clock}
          showDelta={false}
          tone="muted"
        />
        <KpiCard
          label="Approval rate"
          value={data.approvalRatePercent !== null ? `${data.approvalRatePercent}%` : '—'}
          icon={TrendingUp}
          showDelta={approvalDeltaShow}
          delta={
            data.approvalRateDeltaPoints !== null && data.approvalRateDeltaPoints > 0
              ? `+${data.approvalRateDeltaPoints}%`
              : data.approvalRateDeltaPoints !== null
                ? `${data.approvalRateDeltaPoints}%`
                : undefined
          }
          deltaLabel="vs last month"
          deltaClassName={
            data.approvalRateDeltaPoints !== null && data.approvalRateDeltaPoints > 0
              ? 'text-success'
              : data.approvalRateDeltaPoints !== null && data.approvalRateDeltaPoints < 0
                ? 'text-destructive'
                : 'text-muted-foreground'
          }
          tone="accent"
        />
      </div>

      <div className="gap-inset flex flex-wrap items-center">
        <Link
          href="/sites/new"
          className={cn(buttonVariants({ variant: 'default', size: 'default' }), 'rounded-xl')}
        >
          <Plus className="size-4" aria-hidden />
          Submit site
        </Link>
        <Link
          href="/sites"
          className={cn(
            buttonVariants({ variant: 'outline', size: 'default' }),
            'border-border rounded-xl'
          )}
        >
          <Globe className="size-4" aria-hidden />
          Open catalog
        </Link>
        <Button
          type="button"
          variant="ghost"
          size="default"
          className="text-muted-foreground rounded-xl"
          disabled
          title="Coming soon"
        >
          <Search className="size-4" aria-hidden />
          Find prospects
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="default"
          className="text-muted-foreground rounded-xl"
          disabled
          title="Coming soon"
        >
          <Mail className="size-4" aria-hidden />
          Outreach inbox
        </Button>
      </div>

      <Card className="border-border rounded-2xl shadow-none">
        <CardHeader className="gap-inset border-border pb-section [.border-b]:pb-section border-b">
          <div className="gap-block flex flex-wrap items-start justify-between">
            <div>
              <CardTitle className="font-heading text-xl tracking-tight md:text-2xl">
                Catalog pipeline
              </CardTitle>
              <CardDescription className="font-sans text-sm">
                Live counts by listing stage — sites created in the last 30 days
              </CardDescription>
            </div>
            <Link
              href="/sites"
              className="text-primary inline-flex items-center gap-1 font-sans text-sm font-medium hover:underline"
            >
              View catalog
              <ArrowUpRight className="size-4" aria-hidden />
            </Link>
          </div>
        </CardHeader>
        <CardContent className="pt-section">
          <div className="gap-block grid sm:grid-cols-2 lg:grid-cols-5">
            {data.pipeline.map((stage) => (
              <div
                key={stage.status}
                className="border-border bg-muted/15 gap-inset p-inset relative flex flex-col overflow-hidden rounded-xl border"
              >
                <div className="gap-inset flex items-start justify-between">
                  <span className="text-muted-foreground font-sans text-[0.65rem] font-semibold tracking-wider uppercase">
                    {stage.label}
                  </span>
                  <span className="bg-primary/15 text-primary-ink rounded-full px-2 py-0.5 font-sans text-xs font-semibold tabular-nums">
                    {stage.count}
                  </span>
                </div>
                <p className="font-heading text-foreground text-2xl font-semibold tabular-nums">
                  {stage.count}
                </p>
                <div className="bg-muted mt-auto h-1.5 w-full overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full transition-[width]"
                    style={{ width: `${(stage.count / data.pipelineMax) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="gap-block grid lg:grid-cols-3">
        <Card className="border-border rounded-2xl shadow-none lg:col-span-2">
          <CardHeader className="gap-inset border-border [.border-b]:pb-section border-b">
            <div className="gap-block flex flex-wrap items-start justify-between">
              <div>
                <CardTitle className="font-heading text-xl tracking-tight md:text-2xl">
                  Recent submissions
                </CardTitle>
                <CardDescription className="font-sans text-sm">
                  Sites you submitted to the catalog
                </CardDescription>
              </div>
              <Link
                href="/sites"
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'sm' }),
                  'border-border rounded-full'
                )}
              >
                All sites
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-sans text-[0.65rem] font-semibold tracking-wider uppercase">
                    Domain
                  </TableHead>
                  <TableHead className="text-muted-foreground font-sans text-[0.65rem] font-semibold tracking-wider uppercase">
                    DR
                  </TableHead>
                  <TableHead className="text-muted-foreground font-sans text-[0.65rem] font-semibold tracking-wider uppercase">
                    Category
                  </TableHead>
                  <TableHead className="text-muted-foreground font-sans text-[0.65rem] font-semibold tracking-wider uppercase">
                    Price
                  </TableHead>
                  <TableHead className="text-muted-foreground font-sans text-[0.65rem] font-semibold tracking-wider uppercase">
                    Status
                  </TableHead>
                  <TableHead className="text-muted-foreground text-right font-sans text-[0.65rem] font-semibold tracking-wider uppercase">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentSubmissions.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-muted-foreground py-section text-center text-sm"
                    >
                      <div className="gap-block flex flex-col items-center">
                        <p>No submissions yet.</p>
                        <Link
                          href="/sites/new"
                          className={cn(
                            buttonVariants({ variant: 'default', size: 'sm' }),
                            'rounded-lg'
                          )}
                        >
                          Submit your first site
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  data.recentSubmissions.map((row) => {
                    const url = safePublicSiteUrl(row.domain)
                    return (
                      <TableRow key={row.id} className="border-border">
                        <TableCell className="max-w-44 truncate font-medium">
                          <Link href={`/sites/${row.id}`} className="text-primary hover:underline">
                            {row.domain}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground tabular-nums">
                          {row.dr !== null && row.dr !== undefined ? row.dr : '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {row.categoryName ?? '—'}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {row.price.toLocaleString(undefined, {
                            style: 'currency',
                            currency: 'USD',
                            maximumFractionDigits: 0,
                          })}
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              'inline-flex min-h-6 items-center rounded-full px-2 py-0.5 font-sans text-xs font-medium',
                              SITE_STATUS_CHIP[row.status]
                            )}
                          >
                            {SITE_STATUS_LABEL[row.status]}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center justify-end gap-2">
                            <Link
                              href={`/sites/${row.id}`}
                              className="text-primary text-xs font-medium hover:underline"
                            >
                              See details
                            </Link>
                            {url ? (
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-foreground inline-flex"
                                aria-label={`Open ${row.domain} in new tab`}
                              >
                                <ExternalLink className="size-4" />
                              </a>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="gap-block flex flex-col">
          <Card className="border-border rounded-2xl shadow-none">
            <CardHeader className="gap-inset border-border [.border-b]:pb-section border-b">
              <div className="gap-inset flex flex-wrap items-start justify-between">
                <div>
                  <CardTitle className="font-heading text-xl tracking-tight">
                    Submissions trend
                  </CardTitle>
                  <CardDescription className="font-sans text-sm">Last 12 weeks</CardDescription>
                </div>
                {data.trendPercent !== null && data.trendPriorSixWeeksTotal > 0 ? (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 font-sans text-sm font-semibold tabular-nums',
                      data.trendPercent >= 0 ? 'text-success' : 'text-destructive'
                    )}
                  >
                    <TrendingUp className="size-4" aria-hidden />
                    {data.trendPercent > 0 ? '+' : ''}
                    {data.trendPercent}%
                  </span>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="pb-section">
              <WeeklyTrendChart counts={data.weeklySubmissionCounts} />
            </CardContent>
          </Card>

          <Card className="border-border rounded-2xl shadow-none">
            <CardHeader className="gap-inset border-border [.border-b]:pb-section border-b">
              <div className="gap-inset flex items-start justify-between">
                <CardTitle className="font-heading text-xl tracking-tight">
                  Today&apos;s tasks
                </CardTitle>
                <span
                  className="text-muted-foreground inline-flex items-center gap-1 font-sans text-xs font-medium"
                  title="Tasks will appear here when scheduling ships"
                >
                  <Target className="size-4" aria-hidden />
                  All
                </span>
              </div>
            </CardHeader>
            <CardContent className="pb-section">
              <div className="text-muted-foreground gap-block bg-muted/25 px-block py-section flex flex-col items-center justify-center rounded-xl border border-dashed text-center text-sm">
                <CircleCheck className="text-primary size-8" aria-hidden />
                <p className="text-foreground font-medium">You&apos;re all caught up!</p>
                <p className="max-w-xs text-xs leading-relaxed">
                  No tasks for today. We&apos;ll surface follow-ups here when task scheduling is
                  available.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
