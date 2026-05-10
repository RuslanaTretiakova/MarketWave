import Link from 'next/link'
import {
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

import { buttonVariants } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { TableCell, TableRow } from '@/components/ui/table'
import {
  AttentionTableCard,
  KpiCard,
  PipelineCard,
  QuickActionsBar,
  SideListCard,
  WeeklyTrendChart,
} from '@/components/dashboard/_shared'
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

  const pipelineStages = data.pipeline.map((s) => ({
    key: s.status,
    label: s.label,
    count: s.count,
  }))

  return (
    <div className="gap-layout mx-auto flex max-w-6xl flex-col">
      <PageHeader
        title="Sourcing status overview"
        description="Check submission volume, review queue, and listing outcomes at a glance."
        action={
          <Link
            href="/sites/new"
            className={cn(buttonVariants({ variant: 'cta', size: 'default' }), 'rounded-xl')}
          >
            <Plus className="size-4" aria-hidden />
            Submit site
          </Link>
        }
      />

      <QuickActionsBar
        actions={[
          { href: '/sites/new', label: 'Submit site', icon: Plus, variant: 'default' },
          { href: '/sites', label: 'Open catalog', icon: Globe, variant: 'outline' },
          {
            label: 'Find prospects',
            icon: Search,
            variant: 'ghost',
            disabled: true,
            title: 'Coming soon',
          },
          {
            label: 'Outreach inbox',
            icon: Mail,
            variant: 'ghost',
            disabled: true,
            title: 'Coming soon',
          },
        ]}
      />

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
          tone="primaryMuted"
        />
        <KpiCard
          label="Awaiting review"
          value={String(data.sitesPendingReview)}
          icon={Clock}
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

      <PipelineCard
        title="Catalog pipeline"
        description="Live counts by listing stage — sites created in the last 30 days"
        stages={pipelineStages}
        pipelineMax={data.pipelineMax}
        link={{ href: '/sites', label: 'View catalog' }}
        gridClassName="sm:grid-cols-2 lg:grid-cols-4"
      />

      <div className="gap-block grid lg:grid-cols-3">
        <AttentionTableCard
          title="Recent submissions"
          description="Sites you submitted to the catalog"
          link={{ href: '/sites', label: 'All sites' }}
          columns={[
            { key: 'domain', label: 'Domain' },
            { key: 'dr', label: 'DR' },
            { key: 'category', label: 'Category' },
            { key: 'price', label: 'Price' },
            { key: 'status', label: 'Status' },
            { key: 'actions', label: 'Actions', align: 'right' },
          ]}
          rows={data.recentSubmissions}
          emptyState={
            <div className="gap-block flex flex-col items-center">
              <p>No submissions yet.</p>
              <Link
                href="/sites/new"
                className={cn(buttonVariants({ variant: 'default', size: 'sm' }), 'rounded-lg')}
              >
                Submit your first site
              </Link>
            </div>
          }
          renderRow={(row) => {
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
                <TableCell className="text-muted-foreground">{row.categoryName ?? '—'}</TableCell>
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
          }}
        />

        <div className="gap-block flex flex-col">
          <SideListCard
            title="Submissions trend"
            description="Last 12 weeks"
            badge={
              data.trendPercent !== null && data.trendPriorSixWeeksTotal > 0 ? (
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
              ) : undefined
            }
          >
            <WeeklyTrendChart
              counts={data.weeklySubmissionCounts}
              emptyTitle="No submissions in the last 12 weeks."
              emptyHint="New catalog submissions will appear here over time."
            />
          </SideListCard>

          <SideListCard
            title="Today's tasks"
            badge={
              <span
                className="text-muted-foreground inline-flex items-center gap-1 font-sans text-xs font-medium"
                title="Tasks will appear here when scheduling ships"
              >
                <Target className="size-4" aria-hidden />
                All
              </span>
            }
          >
            <div className="text-muted-foreground gap-block bg-muted/25 px-block py-section flex flex-col items-center justify-center rounded-xl border border-dashed text-center text-sm">
              <CircleCheck className="text-primary size-8" aria-hidden />
              <p className="text-foreground font-medium">You&apos;re all caught up!</p>
              <p className="max-w-xs text-xs leading-relaxed">
                No tasks for today. We&apos;ll surface follow-ups here when task scheduling is
                available.
              </p>
            </div>
          </SideListCard>
        </div>
      </div>
    </div>
  )
}
