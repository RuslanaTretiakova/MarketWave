import Link from 'next/link'
import {
  ArrowUpRight,
  CheckCircle2,
  ClipboardList,
  Globe,
  Inbox,
  MessageSquare,
  Receipt,
  ShoppingCart,
  Sparkles,
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
} from '@/components/dashboard/_shared'
import type { ClientDashboardData } from '@/lib/dashboard/load-client-dashboard'
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

export function ClientDashboard({
  data,
  greetingName,
  unreadByEvent,
}: {
  data: ClientDashboardData
  greetingName: string | null
  unreadByEvent?: UnreadByEvent
}) {
  const who = greetingName?.trim() || 'there'
  return (
    <div className="gap-layout mx-auto flex max-w-6xl flex-col">
      <PageHeader
        title={`Welcome back, ${who}`}
        description="Your hub for orders, approvals, and billing."
        action={
          <Link
            href="/sites"
            className={cn(buttonVariants({ variant: 'cta', size: 'xl' }), 'rounded-xl')}
          >
            <Globe className="size-4" aria-hidden />
            Browse catalog
          </Link>
        }
      />

      {unreadByEvent ? <NotificationsSummaryCard counts={unreadByEvent} /> : null}

      <QuickActionsBar
        actions={[
          { href: '/cart', label: 'View cart', icon: ShoppingCart, variant: 'outline' },
          { href: '/orders', label: 'My orders', icon: ClipboardList, variant: 'outline' },
          { href: '/invoices', label: 'My invoices', icon: Receipt, variant: 'outline' },
          { href: '/chats', label: 'Chats', icon: MessageSquare, variant: 'ghost' },
        ]}
      />

      <div className="gap-block grid sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Orders in flight"
          value={String(data.ordersInFlight)}
          icon={ClipboardList}
          href="/orders"
          ariaLabel={`Orders in flight: ${data.ordersInFlight}. Open orders.`}
          tone="primary"
        />
        <KpiCard
          label="Awaiting your approval"
          value={String(data.pendingApprovals)}
          icon={Inbox}
          href="/orders?status=content_sent"
          ariaLabel={`Awaiting your approval: ${data.pendingApprovals}. Open orders awaiting approval.`}
          showDelta={data.pendingApprovals > 0}
          delta="Action required"
          deltaClassName="text-accent"
          tone="accent"
        />
        <KpiCard
          label="Completed orders"
          value={String(data.ordersCompleted)}
          icon={CheckCircle2}
          href="/orders?status=completed"
          ariaLabel={`Completed orders: ${data.ordersCompleted}. Open completed orders.`}
          tone="primaryMuted"
        />
        <KpiCard
          label="Open invoices"
          value={moneyUSD(data.openInvoiceTotal)}
          icon={Receipt}
          href="/invoices"
          ariaLabel={`Open invoices: ${moneyUSD(data.openInvoiceTotal)}. Open invoices.`}
          showDelta={data.openInvoiceCount > 0}
          delta={`${data.openInvoiceCount} open`}
          deltaClassName="text-muted-foreground"
          tone="muted"
        />
      </div>

      <PipelineCard
        title="Order pipeline"
        description="Live counts by stage for your orders"
        stages={data.pipeline}
        pipelineMax={data.pipelineMax}
        link={{ href: '/orders', label: 'View orders' }}
      />

      <div className="gap-block grid lg:grid-cols-3">
        <AttentionTableCard
          title="Awaiting your approval"
          description="Drafts submitted by the team — review and approve or request changes."
          link={{ href: '/orders?status=content_sent', label: 'All' }}
          columns={[
            { key: 'domain', label: 'Domain' },
            { key: 'price', label: 'Price' },
            { key: 'status', label: 'Status' },
            { key: 'open', label: 'Open', align: 'right' },
          ]}
          rows={data.awaitingApproval}
          emptyState={
            <div className="gap-block flex flex-col items-center">
              <Sparkles className="text-primary size-8" aria-hidden />
              <p className="text-foreground font-medium">All caught up</p>
              <p className="max-w-xs text-xs leading-relaxed">
                Nothing waiting on your review right now.
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
                  Review
                </Link>
              </TableCell>
            </TableRow>
          )}
        />

        <div className="gap-block flex flex-col">
          <SideListCard
            title="Recent orders"
            description="Your active placements"
            link={{ href: '/orders', label: 'All' }}
          >
            {data.recentOrders.length === 0 ? (
              <div className="text-muted-foreground gap-block bg-muted/25 px-block py-section flex flex-col items-center justify-center rounded-xl border border-dashed text-center text-sm">
                <ClipboardList className="text-muted-foreground/50 size-8" aria-hidden />
                <p className="text-foreground font-medium">No active orders</p>
                <Link
                  href="/sites"
                  className={cn(buttonVariants({ variant: 'default', size: 'sm' }), 'rounded-lg')}
                >
                  Browse catalog
                </Link>
              </div>
            ) : (
              <ul className="gap-inset flex flex-col">
                {data.recentOrders.map((row) => (
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
                    <div className="flex items-end justify-between">
                      <p className="text-foreground font-semibold tabular-nums">
                        ${row.price.toFixed(2)}
                      </p>
                      <Link
                        href={`/orders/${row.id}`}
                        className="text-primary inline-flex items-center gap-1 text-xs font-medium hover:underline"
                      >
                        Open
                        <ArrowUpRight className="size-3.5" aria-hidden />
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SideListCard>

          <SideListCard
            title="Open invoices"
            description="Draft and sent"
            link={{ href: '/invoices', label: 'All' }}
          >
            {data.openInvoices.length === 0 ? (
              <div className="text-muted-foreground gap-block bg-muted/25 px-block py-section flex flex-col items-center justify-center rounded-xl border border-dashed text-center text-sm">
                <CheckCircle2 className="text-primary size-8" aria-hidden />
                <p className="text-foreground font-medium">All paid up</p>
              </div>
            ) : (
              <ul className="gap-inset flex flex-col">
                {data.openInvoices.map((row) => (
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

          {data.cartItemCount > 0 ? (
            <SideListCard
              title="Cart"
              badge={
                <span className="text-primary-ink bg-primary/15 inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-sans text-xs font-semibold tabular-nums">
                  <ShoppingCart className="size-3" aria-hidden />
                  {data.cartItemCount}
                </span>
              }
            >
              <Link
                href="/cart"
                className={cn(
                  buttonVariants({ variant: 'default', size: 'sm' }),
                  'w-full justify-center rounded-lg'
                )}
              >
                Review and checkout
              </Link>
            </SideListCard>
          ) : null}
        </div>
      </div>
    </div>
  )
}
