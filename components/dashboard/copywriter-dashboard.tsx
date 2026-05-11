import Link from 'next/link'
import {
  CheckCircle2,
  ClipboardList,
  ListChecks,
  MessageSquare,
  Send,
  Sparkles,
  TrendingUp,
} from 'lucide-react'

import { buttonVariants } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { TableCell, TableRow } from '@/components/ui/table'
import {
  AttentionTableCard,
  KpiCard,
  NotificationsSummaryCard,
  PipelineCard,
  QuickActionsBar,
  SideListCard,
  WeeklyTrendChart,
} from '@/components/dashboard/_shared'
import type { CopywriterDashboardData } from '@/lib/dashboard/load-copywriter-dashboard'
import type { UnreadByEvent } from '@/lib/notifications/load-notifications'
import { ORDER_STATUS_CHIP, ORDER_STATUS_LABEL } from '@/lib/orders/order-status-labels'
import { cn } from '@/lib/utils'

function moneyUSD(n: number) {
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  })
}

export function CopywriterDashboard({
  data,
  greetingName,
  unreadByEvent,
}: {
  data: CopywriterDashboardData
  greetingName: string | null
  unreadByEvent?: UnreadByEvent
}) {
  const who = greetingName?.trim() || 'there'
  return (
    <div className="gap-layout mx-auto flex max-w-6xl flex-col">
      <PageHeader
        title={`Copy workspace, ${who}`}
        description="Your assigned orders, change requests, and review queue."
        action={
          <Link
            href="/orders?status=in_progress"
            className={cn(buttonVariants({ variant: 'cta', size: 'xl' }), 'rounded-xl')}
          >
            <ClipboardList className="size-4" aria-hidden />
            Open my queue
          </Link>
        }
      />

      {unreadByEvent ? <NotificationsSummaryCard counts={unreadByEvent} /> : null}

      <QuickActionsBar
        actions={[
          {
            href: '/orders?status=needs_changes',
            label: 'Needs revision',
            icon: ListChecks,
            variant: 'outline',
          },
          {
            href: '/orders?status=content_sent',
            label: 'Sent for review',
            icon: Send,
            variant: 'outline',
          },
          { href: '/chats', label: 'Chats', icon: MessageSquare, variant: 'ghost' },
        ]}
      />

      <div className="gap-block grid sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Assigned"
          value={String(data.assignedOrders)}
          icon={ClipboardList}
          href="/orders"
          ariaLabel={`Assigned orders: ${data.assignedOrders}. Open orders.`}
          tone="primary"
        />
        <KpiCard
          label="Pending content send"
          value={String(data.pendingContentSend)}
          icon={Send}
          href="/orders?status=in_progress"
          ariaLabel={`Pending content send: ${data.pendingContentSend}. Open in progress orders.`}
          tone="primaryMuted"
        />
        <KpiCard
          label="Needs revision"
          value={String(data.needsRevisionOrders)}
          icon={ListChecks}
          href="/orders?status=needs_changes"
          ariaLabel={`Needs revision: ${data.needsRevisionOrders}. Open orders needing changes.`}
          showDelta={data.needsRevisionOrders > 0}
          delta="Action required"
          deltaClassName="text-accent"
          tone="accent"
        />
        <KpiCard
          label="Approval rate"
          value={data.approvalRatePercent !== null ? `${data.approvalRatePercent}%` : '—'}
          icon={TrendingUp}
          href="/orders"
          ariaLabel="Approval rate. Open orders."
          tone="muted"
        />
      </div>

      <PipelineCard
        title="My pipeline"
        description="Live counts by stage for your assigned orders"
        stages={data.pipeline}
        pipelineMax={data.pipelineMax}
        link={{ href: '/orders', label: 'View orders' }}
        gridClassName="sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
      />

      <div className="gap-block grid lg:grid-cols-3">
        <AttentionTableCard
          title="Up next"
          description="Orders to write or revise — oldest first."
          link={{ href: '/orders', label: 'All orders' }}
          columns={[
            { key: 'domain', label: 'Domain' },
            { key: 'price', label: 'Price' },
            { key: 'status', label: 'Status' },
            { key: 'open', label: 'Open', align: 'right' },
          ]}
          rows={data.upNext}
          emptyState={
            <div className="gap-block flex flex-col items-center">
              <Sparkles className="text-primary size-8" aria-hidden />
              <p className="text-foreground font-medium">All caught up!</p>
              <p className="max-w-xs text-xs leading-relaxed">
                Nothing in your queue right now. New assignments will appear here.
              </p>
            </div>
          }
          renderRow={(row) => (
            <TableRow key={row.id} className="border-border">
              <TableCell className="max-w-44 truncate font-medium">
                <Link href={`/orders/${row.id}`} className="text-primary hover:underline">
                  {row.site_domain}
                </Link>
              </TableCell>
              <TableCell className="tabular-nums">{moneyUSD(row.price)}</TableCell>
              <TableCell>
                <span
                  className={cn(
                    'inline-flex min-h-6 items-center rounded-full px-2 py-0.5 font-sans text-xs font-medium',
                    ORDER_STATUS_CHIP[row.status]
                  )}
                >
                  {ORDER_STATUS_LABEL[row.status]}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <Link
                  href={`/orders/${row.id}`}
                  className="text-primary text-xs font-medium hover:underline"
                >
                  Open
                </Link>
              </TableCell>
            </TableRow>
          )}
        />

        <div className="gap-block flex flex-col">
          <SideListCard
            title="Sent for review"
            description="Drafts awaiting client approval"
            link={{ href: '/orders?status=content_sent', label: 'All' }}
          >
            {data.sentForReview.length === 0 ? (
              <div className="text-muted-foreground gap-block bg-muted/25 px-block py-section flex flex-col items-center justify-center rounded-xl border border-dashed text-center text-sm">
                <Send className="text-muted-foreground/50 size-8" aria-hidden />
                <p className="text-foreground font-medium">Nothing in review</p>
                <p className="max-w-xs text-xs leading-relaxed">
                  Drafts you submit for client approval show up here.
                </p>
              </div>
            ) : (
              <ul className="gap-inset flex flex-col">
                {data.sentForReview.map((row) => (
                  <li
                    key={row.id}
                    className="border-border bg-muted/10 p-inset gap-inset flex flex-col rounded-xl border"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/orders/${row.id}`}
                        className="text-foreground max-w-44 truncate text-sm font-medium hover:underline"
                      >
                        {row.site_domain}
                      </Link>
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2 py-0.5 text-[0.65rem] font-medium',
                          ORDER_STATUS_CHIP[row.status]
                        )}
                      >
                        {ORDER_STATUS_LABEL[row.status]}
                      </span>
                    </div>
                    <p className="text-foreground font-semibold tabular-nums">
                      {moneyUSD(row.price)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </SideListCard>

          <SideListCard
            title="Completed"
            description="Last 12 weeks"
            badge={
              data.completedOrders > 0 ? (
                <span className="text-primary-ink bg-primary/15 inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-sans text-xs font-semibold tabular-nums">
                  <CheckCircle2 className="size-3" aria-hidden />
                  {data.completedOrders}
                </span>
              ) : undefined
            }
          >
            <WeeklyTrendChart
              counts={data.weeklyCompletedCounts}
              emptyTitle="No completions in the last 12 weeks."
              emptyHint="Each completed order will appear in this trend."
            />
          </SideListCard>
        </div>
      </div>
    </div>
  )
}
