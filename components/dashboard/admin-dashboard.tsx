import Link from 'next/link'
import {
  ClipboardList,
  DollarSign,
  Globe,
  Mail,
  MessageSquare,
  Receipt,
  Tags,
  TrendingUp,
  UserPlus,
  Users,
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
import type { AdminDashboardData } from '@/lib/dashboard/load-admin-dashboard'
import { INVOICE_STATUS_CHIP, INVOICE_STATUS_LABEL } from '@/lib/invoices/invoice-status-labels'
import { cn } from '@/lib/utils'

function moneyUSD(n: number) {
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  })
}

export function AdminDashboard({ data }: { data: AdminDashboardData }) {
  const completedDeltaShow = data.ordersCompletedPrevMonth > 0
  const completedDeltaText =
    data.ordersCompletedDelta === 0
      ? '0'
      : data.ordersCompletedDelta > 0
        ? `+${data.ordersCompletedDelta}`
        : `${data.ordersCompletedDelta}`

  return (
    <div className="gap-layout mx-auto flex max-w-6xl flex-col">
      <PageHeader
        title="Admin dashboard"
        description="Track orders, sites, billing, and team activity across the whole organization."
        action={
          <Link
            href="/settings/users"
            className={cn(buttonVariants({ variant: 'cta', size: 'default' }), 'rounded-xl')}
          >
            <UserPlus className="size-4" aria-hidden />
            Invite user
          </Link>
        }
      />

      <QuickActionsBar
        actions={[
          { href: '/settings/users', label: 'Manage users', icon: Users, variant: 'default' },
          { href: '/settings/categories', label: 'Categories', icon: Tags, variant: 'outline' },
          { href: '/sites', label: 'Site catalog', icon: Globe, variant: 'outline' },
          { href: '/invoices', label: 'Invoices', icon: Receipt, variant: 'outline' },
          { href: '/chats', label: 'Chats', icon: MessageSquare, variant: 'ghost' },
        ]}
      />

      <div className="gap-block grid sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Active orders"
          value={String(data.totalActiveOrders)}
          icon={ClipboardList}
          tone="primary"
        />
        <KpiCard
          label="Sites in review"
          value={String(data.sitesInReview)}
          icon={Globe}
          tone="muted"
        />
        <KpiCard
          label="Open invoices"
          value={moneyUSD(data.pendingInvoiceTotal)}
          icon={Receipt}
          showDelta={data.pendingInvoiceCount > 0}
          delta={`${data.pendingInvoiceCount} open`}
          deltaClassName="text-muted-foreground"
          tone="accent"
        />
        <KpiCard
          label="Paid revenue"
          value={moneyUSD(data.paidRevenue)}
          icon={DollarSign}
          showDelta={data.paidInvoices > 0}
          delta={`${data.paidInvoices} invoices`}
          deltaClassName="text-muted-foreground"
          tone="primaryMuted"
        />
      </div>

      <PipelineCard
        title="Order pipeline"
        description="Live counts by order stage across all clients"
        stages={data.pipeline}
        pipelineMax={data.pipelineMax}
        link={{ href: '/orders', label: 'View orders' }}
      />

      <div className="gap-block grid lg:grid-cols-3">
        <AttentionTableCard
          title="Sites awaiting review"
          description="Oldest sourcer submissions first — approve or send back."
          link={{ href: '/sites?status=pending', label: 'All pending' }}
          columns={[
            { key: 'domain', label: 'Domain' },
            { key: 'sourcer', label: 'Sourcer' },
            { key: 'dr', label: 'DR' },
            { key: 'price', label: 'Price' },
            { key: 'age', label: 'Waiting' },
            { key: 'open', label: 'Open', align: 'right' },
          ]}
          rows={data.attentionSites}
          emptyState="Nothing waiting — every site has been reviewed."
          renderRow={(row) => (
            <TableRow key={row.id} className="border-border">
              <TableCell className="max-w-44 truncate font-medium">
                <Link href={`/sites/${row.id}`} className="text-primary hover:underline">
                  {row.domain}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {row.sourcer_name ?? <span className="italic">Unknown</span>}
              </TableCell>
              <TableCell className="text-muted-foreground tabular-nums">{row.dr ?? '—'}</TableCell>
              <TableCell className="tabular-nums">{moneyUSD(row.price)}</TableCell>
              <TableCell className="text-muted-foreground font-mono text-xs tabular-nums">
                {row.age_days}d
              </TableCell>
              <TableCell className="text-right">
                <Link
                  href={`/sites/${row.id}`}
                  className="text-primary text-xs font-medium hover:underline"
                >
                  Review
                </Link>
              </TableCell>
            </TableRow>
          )}
        />

        <div className="gap-block flex flex-col">
          <SideListCard
            title="Outstanding invoices"
            description="Pending and overdue"
            link={{ href: '/invoices', label: 'All' }}
          >
            {data.unpaidInvoices.length === 0 ? (
              <div className="text-muted-foreground gap-block bg-muted/25 px-block py-section flex flex-col items-center justify-center rounded-xl border border-dashed text-center text-sm">
                <Mail className="text-primary size-8" aria-hidden />
                <p className="text-foreground font-medium">All caught up</p>
                <p className="max-w-xs text-xs leading-relaxed">
                  Every invoice has been paid or canceled.
                </p>
              </div>
            ) : (
              <ul className="gap-inset flex flex-col">
                {data.unpaidInvoices.map((row) => (
                  <li
                    key={row.id}
                    className="border-border bg-muted/10 p-inset gap-inset flex flex-col rounded-xl border"
                  >
                    <div className="flex items-start justify-between gap-2">
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
                            ? `${row.age_days}d overdue`
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
            title="Active conversations"
            badge={
              <span
                className="text-primary-ink bg-primary/15 inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-sans text-xs font-semibold tabular-nums"
                title="Chat rooms across teams and clients"
              >
                <MessageSquare className="size-3" aria-hidden />
                {data.activeChatRooms}
              </span>
            }
          >
            <Link
              href="/chats"
              className="text-primary inline-flex items-center gap-1 font-sans text-sm font-medium hover:underline"
            >
              Open chats
            </Link>
          </SideListCard>
        </div>
      </div>
    </div>
  )
}
