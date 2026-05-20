import Link from 'next/link'
import {
  CheckCircle2,
  CircleCheck,
  Clock,
  ExternalLink,
  Plus,
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
  NotificationsSummaryCard,
  SideListCard,
  WeeklyTrendChart,
} from '@/components/dashboard/_shared'
import type { SourcerDashboardData } from '@/lib/dashboard/load-sourcer-dashboard'
import type { UnreadByEvent } from '@/lib/notifications/load-notifications'
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
  unreadByEvent,
}: {
  data: SourcerDashboardData
  greetingName: string | null
  unreadByEvent?: UnreadByEvent
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
    <div className="gap-layout flex flex-col">
      <PageHeader
        title="Sourcing status overview"
        description="Volume, listing health, and trends — use Site catalog filters for counts by status."
        action={
          <Link
            href="/sites/new"
            className={cn(buttonVariants({ variant: 'cta', size: 'xl' }), 'rounded-xl')}
          >
            <Plus className="size-4" aria-hidden />
            Submit site
          </Link>
        }
      />

      {unreadByEvent ? <NotificationsSummaryCard counts={unreadByEvent} /> : null}

      <div className="gap-block grid sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Sites submitted (mo)"
          value={String(data.submittedThisMonth)}
          icon={Upload}
          href="/sites"
          ariaLabel={`Sites submitted this month: ${data.submittedThisMonth}. Open site catalog.`}
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
          label="Active in catalog"
          value={String(data.sitesActive)}
          icon={CheckCircle2}
          href="/sites?status=active"
          ariaLabel={`Active in catalog: ${data.sitesActive}. Open active sites.`}
          tone="primaryMuted"
        />
        <KpiCard
          label="Pending review"
          value={String(data.sitesPendingReview)}
          icon={Clock}
          href="/sites?status=pending"
          ariaLabel={`Pending review: ${data.sitesPendingReview}. Open pending sites.`}
          tone="muted"
        />
        <KpiCard
          label="Approval rate"
          value={data.approvalRatePercent !== null ? `${data.approvalRatePercent}%` : '—'}
          icon={TrendingUp}
          href="/sites"
          ariaLabel="Approval rate. Open site catalog."
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

      <div className="gap-block grid lg:grid-cols-3">
        <AttentionTableCard
          title="Recent submissions"
          description="Your latest submitted sites — open Site catalog for the full list."
          link={{ href: '/sites', label: 'Site catalog' }}
          columns={[
            { key: 'domain', label: 'Domain' },
            { key: 'dr', label: 'DR' },
            { key: 'category', label: 'Category' },
            { key: 'price', label: 'Price' },
            { key: 'status', label: 'Status' },
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
                <TableCell className="max-w-52 font-medium">
                  <div className="gap-inset flex min-w-0 items-center">
                    <Link
                      href={`/sites/${row.id}`}
                      className="text-primary truncate hover:underline"
                    >
                      {row.domain}
                    </Link>
                    {url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground inline-flex shrink-0"
                        aria-label={`Open ${row.domain} in new tab`}
                      >
                        <ExternalLink className="size-4" />
                      </a>
                    ) : null}
                  </div>
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
              emptyHint="New site submissions will appear here over time."
            />
          </SideListCard>

          <SideListCard
            title="Today's tasks"
            description="Follow-ups and reminders will appear here first once scheduling is available."
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
              <p className="text-muted-foreground mt-inset text-xs">
                <Link href="/chats" className="text-primary font-medium hover:underline">
                  Open chats
                </Link>
                <span aria-hidden className="mx-1.5">
                  ·
                </span>
                <Link href="/notifications" className="text-primary font-medium hover:underline">
                  Notifications
                </Link>
              </p>
            </div>
          </SideListCard>
        </div>
      </div>
    </div>
  )
}
