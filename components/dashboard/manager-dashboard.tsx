import Link from 'next/link'
import {
  CheckCircle2,
  ClipboardList,
  DollarSign,
  Mail,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react'

import { buttonVariants } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { TableCell, TableRow } from '@/components/ui/table'
import {
  AttentionTableCard,
  KpiCard,
  NotificationsSummaryCard,
  PipelineCard,
  SideListCard,
  WeeklyTrendChart,
} from '@/components/dashboard/_shared'
import type { ManagerDashboardData } from '@/lib/dashboard/load-manager-dashboard'
import type { UnreadByEvent } from '@/lib/notifications/load-notifications'
import { INVOICE_STATUS_CHIP, INVOICE_STATUS_LABEL } from '@/lib/invoices/invoice-status-labels'
import { ORDER_STATUS_CHIP, ORDER_STATUS_LABEL } from '@/lib/orders/order-status-labels'
import { cn } from '@/lib/utils'

function moneyUSD(n: number) {
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  })
}

export function ManagerDashboard({
  data,
  unreadByEvent,
}: {
  data: ManagerDashboardData
  greetingName: string | null
  unreadByEvent?: UnreadByEvent
}) {
  const completedDeltaShow = data.ordersCompletedPrevMonth > 0
  const completedDeltaText =
    data.ordersCompletedDelta === 0
      ? '0'
      : data.ordersCompletedDelta > 0
        ? `+${data.ordersCompletedDelta}`
        : `${data.ordersCompletedDelta}`

  const pipelineStages = data.pipeline.map((s) => ({
    key: s.status,
    label: s.label,
    count: s.count,
  }))

  return (
    <div className="gap-layout mx-auto flex max-w-6xl flex-col">
      <PageHeader
        title="Manager dashboard"
        description="Track open orders, copywriter assignments, billing, and approvals at a glance."
        action={
          <Link
            href="/orders"
            className={cn(buttonVariants({ variant: 'cta', size: 'xl' }), 'rounded-xl')}
          >
            <ClipboardList className="size-4" aria-hidden />
            Manage orders
          </Link>
        }
      />

      {unreadByEvent ? <NotificationsSummaryCard counts={unreadByEvent} /> : null}

      <div className="gap-block grid sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Active orders"
          value={String(data.totalActiveOrders)}
          icon={ClipboardList}
          href="/orders"
          ariaLabel={`Active orders: ${data.totalActiveOrders}. Open orders.`}
          tone="primary"
        />
        <KpiCard
          label="Awaiting assignment"
          value={String(data.ordersAwaitingAssignment)}
          icon={UserCheck}
          href="/orders?status=new"
          ariaLabel={`Awaiting assignment: ${data.ordersAwaitingAssignment}. Open orders.`}
          tone="muted"
        />
        <KpiCard
          label="Ready to publish"
          value={String(data.ordersReadyToPublish)}
          icon={CheckCircle2}
          href="/orders?status=content_approved"
          ariaLabel={`Ready to publish: ${data.ordersReadyToPublish}. Open orders filtered by ready to publish.`}
          tone="primaryMuted"
        />
        <KpiCard
          label="Unpaid invoices"
          value={moneyUSD(data.unpaidInvoiceTotal)}
          icon={DollarSign}
          href="/invoices"
          ariaLabel={`Unpaid invoices total ${moneyUSD(data.unpaidInvoiceTotal)}. Open invoices.`}
          showDelta={data.unpaidInvoiceCount > 0}
          delta={`${data.unpaidInvoiceCount} open`}
          deltaClassName="text-muted-foreground"
          tone="accent"
        />
      </div>

      <PipelineCard
        title="Order pipeline"
        description="Live counts by order stage"
        stages={pipelineStages}
        pipelineMax={data.pipelineMax}
        link={{ href: '/orders', label: 'View orders' }}
      />

      <div className="gap-block grid lg:grid-cols-3">
        <AttentionTableCard
          title="Needs attention"
          description="Oldest orders waiting on assignment, review, or publish"
          link={{ href: '/orders', label: 'All orders' }}
          columns={[
            { key: 'domain', label: 'Domain' },
            { key: 'client', label: 'Client' },
            { key: 'copywriter', label: 'Copywriter' },
            { key: 'status', label: 'Status' },
            { key: 'open', label: 'Open', align: 'right' },
          ]}
          rows={data.attentionOrders}
          emptyState="Nothing waiting — every order is in motion."
          renderRow={(row) => (
            <TableRow key={row.id} className="border-border">
              <TableCell className="max-w-44 truncate font-medium">
                <Link href={`/orders/${row.id}`} className="text-primary hover:underline">
                  {row.site_domain}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">{row.client_name ?? '—'}</TableCell>
              <TableCell className="text-muted-foreground">
                {row.copywriter_name ?? <span className="italic">Unassigned</span>}
              </TableCell>
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
            title="Outstanding invoices"
            description="Draft and sent"
            link={{ href: '/invoices', label: 'All' }}
          >
            {data.unpaidInvoices.length === 0 ? (
              <div className="text-muted-foreground gap-block bg-muted/25 px-block py-section flex flex-col items-center justify-center rounded-xl border border-dashed text-center text-sm">
                <Mail className="text-primary size-8" aria-hidden />
                <p className="text-foreground font-medium">All caught up</p>
                <p className="max-w-xs text-xs leading-relaxed">Every invoice has been paid.</p>
              </div>
            ) : (
              <ul className="gap-inset flex flex-col">
                {data.unpaidInvoices.map((row) => (
                  <li
                    key={row.id}
                    className="border-border bg-muted/10 p-inset gap-inset flex flex-col rounded-xl border"
                  >
                    <div className="gap-inset flex items-start justify-between">
                      <Link
                        href={`/invoices/${row.id}`}
                        className="text-foreground max-w-44 truncate text-sm font-medium hover:underline"
                      >
                        {row.site_domain}
                      </Link>
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2 py-0.5 text-[0.65rem] font-medium',
                          INVOICE_STATUS_CHIP[row.status]
                        )}
                      >
                        {INVOICE_STATUS_LABEL[row.status]}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {row.client_name ?? 'Unknown client'}
                    </p>
                    <div className="flex items-end justify-between">
                      <p className="text-foreground font-semibold tabular-nums">
                        ${row.amount.toFixed(2)}
                      </p>
                      <p className="text-muted-foreground font-mono text-[0.65rem] tabular-nums">
                        {row.due_date
                          ? row.age_days !== null && row.age_days > 0
                            ? `${row.age_days}d open`
                            : `Due ${row.due_date}`
                          : 'No due date'}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SideListCard>

          <SideListCard
            title="Completed orders"
            description="Last 12 weeks"
            badge={
              completedDeltaShow ? (
                <span
                  className={cn(
                    'inline-flex items-center gap-1 font-sans text-sm font-semibold tabular-nums',
                    data.ordersCompletedDelta >= 0 ? 'text-success' : 'text-destructive'
                  )}
                >
                  <TrendingUp className="size-4" aria-hidden />
                  {completedDeltaText}
                </span>
              ) : undefined
            }
          >
            <WeeklyTrendChart
              counts={data.weeklyCompletedCounts}
              emptyTitle="No completions in the last 12 weeks."
            />
          </SideListCard>

          <SideListCard
            title="Sites awaiting review"
            badge={
              <span
                className="text-primary-ink bg-primary/15 inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-sans text-xs font-semibold tabular-nums"
                title="Sourcer submissions to review"
              >
                <Users className="size-3" aria-hidden />
                {data.sitesPendingReview}
              </span>
            }
          >
            <Link
              href="/sites?status=pending"
              className="text-primary inline-flex items-center gap-1 font-sans text-sm font-medium hover:underline"
            >
              Review pending sites
            </Link>
          </SideListCard>
        </div>
      </div>
    </div>
  )
}
