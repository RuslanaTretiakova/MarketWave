import Link from 'next/link'
import type { ComponentType } from 'react'
import {
  ArrowUpRight,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  Globe,
  Mail,
  MessageSquare,
  Receipt,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react'

import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { INVOICE_STATUS_CHIP, INVOICE_STATUS_LABEL } from '@/lib/invoices/invoice-status-labels'
import type { ManagerDashboardData } from '@/lib/dashboard/load-manager-dashboard'
import { ORDER_STATUS_CHIP, ORDER_STATUS_LABEL } from '@/lib/orders/order-status-labels'
import { cn } from '@/lib/utils'

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
        <p>No completions in the last 12 weeks.</p>
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

function moneyUSD(n: number) {
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  })
}

export function ManagerDashboard({
  data,
}: {
  data: ManagerDashboardData
  greetingName: string | null
}) {
  const completedDeltaShow = data.ordersCompletedPrevMonth > 0
  const completedDeltaText =
    data.ordersCompletedDelta === 0
      ? '0'
      : data.ordersCompletedDelta > 0
        ? `+${data.ordersCompletedDelta}`
        : `${data.ordersCompletedDelta}`

  return (
    <div className="gap-layout mx-auto flex max-w-6xl flex-col">
      <div className="gap-inset flex flex-col">
        <h1 className="font-heading text-foreground text-3xl font-semibold tracking-tight md:text-4xl">
          Manager dashboard
        </h1>
        <p className="text-muted-foreground max-w-xl font-sans text-sm leading-relaxed">
          Track open orders, copywriter assignments, billing, and approvals at a glance.
        </p>
      </div>

      <div className="gap-block grid sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Active orders"
          value={String(data.totalActiveOrders)}
          icon={ClipboardList}
          showDelta={false}
          tone="primary"
        />
        <KpiCard
          label="Awaiting assignment"
          value={String(data.ordersAwaitingAssignment)}
          icon={UserCheck}
          showDelta={false}
          tone="muted"
        />
        <KpiCard
          label="Ready to publish"
          value={String(data.ordersReadyToPublish)}
          icon={CheckCircle2}
          showDelta={false}
          tone="primaryMuted"
        />
        <KpiCard
          label="Unpaid invoices"
          value={moneyUSD(data.unpaidInvoiceTotal)}
          icon={DollarSign}
          showDelta={data.unpaidInvoiceCount > 0}
          delta={`${data.unpaidInvoiceCount} open`}
          deltaLabel=""
          deltaClassName="text-muted-foreground"
          tone="accent"
        />
      </div>

      <div className="gap-inset flex flex-wrap items-center">
        <Link
          href="/orders"
          className={cn(buttonVariants({ variant: 'default', size: 'default' }), 'rounded-xl')}
        >
          <ClipboardList className="size-4" aria-hidden />
          Manage orders
        </Link>
        <Link
          href="/invoices"
          className={cn(
            buttonVariants({ variant: 'outline', size: 'default' }),
            'border-border rounded-xl'
          )}
        >
          <Receipt className="size-4" aria-hidden />
          Open invoices
        </Link>
        <Link
          href="/sites"
          className={cn(
            buttonVariants({ variant: 'outline', size: 'default' }),
            'border-border rounded-xl'
          )}
        >
          <Globe className="size-4" aria-hidden />
          Site catalog
        </Link>
        <Link
          href="/chats"
          className={cn(buttonVariants({ variant: 'ghost', size: 'default' }), 'rounded-xl')}
        >
          <MessageSquare className="size-4" aria-hidden />
          Open chats
        </Link>
      </div>

      <Card className="border-border rounded-2xl shadow-none">
        <CardHeader className="gap-inset border-border pb-section [.border-b]:pb-section border-b">
          <div className="gap-block flex flex-wrap items-start justify-between">
            <div>
              <CardTitle className="font-heading text-xl tracking-tight md:text-2xl">
                Order pipeline
              </CardTitle>
              <CardDescription className="font-sans text-sm">
                Live counts by order stage
              </CardDescription>
            </div>
            <Link
              href="/orders"
              className="text-primary inline-flex items-center gap-1 font-sans text-sm font-medium hover:underline"
            >
              View orders
              <ArrowUpRight className="size-4" aria-hidden />
            </Link>
          </div>
        </CardHeader>
        <CardContent className="pt-section">
          <div className="gap-block grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
                  Needs attention
                </CardTitle>
                <CardDescription className="font-sans text-sm">
                  Oldest orders waiting on assignment, review, or publish
                </CardDescription>
              </div>
              <Link
                href="/orders"
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'sm' }),
                  'border-border rounded-full'
                )}
              >
                All orders
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
                    Client
                  </TableHead>
                  <TableHead className="text-muted-foreground font-sans text-[0.65rem] font-semibold tracking-wider uppercase">
                    Copywriter
                  </TableHead>
                  <TableHead className="text-muted-foreground font-sans text-[0.65rem] font-semibold tracking-wider uppercase">
                    Status
                  </TableHead>
                  <TableHead className="text-muted-foreground text-right font-sans text-[0.65rem] font-semibold tracking-wider uppercase">
                    Open
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.attentionOrders.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-muted-foreground py-section text-center text-sm"
                    >
                      Nothing waiting — every order is in motion.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.attentionOrders.map((row) => (
                    <TableRow key={row.id} className="border-border">
                      <TableCell className="max-w-44 truncate font-medium">
                        <Link href={`/orders/${row.id}`} className="text-primary hover:underline">
                          {row.site_domain}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.client_name ?? '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.copywriter_name ?? (
                          <span className="text-muted-foreground italic">Unassigned</span>
                        )}
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
                  ))
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
                    Outstanding invoices
                  </CardTitle>
                  <CardDescription className="font-sans text-sm">
                    Pending and overdue
                  </CardDescription>
                </div>
                <Link
                  href="/invoices"
                  className="text-primary inline-flex items-center gap-1 font-sans text-sm font-medium hover:underline"
                >
                  All
                  <ArrowUpRight className="size-4" aria-hidden />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-section pb-section">
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
            </CardContent>
          </Card>

          <Card className="border-border rounded-2xl shadow-none">
            <CardHeader className="gap-inset border-border [.border-b]:pb-section border-b">
              <div className="gap-inset flex items-start justify-between">
                <div>
                  <CardTitle className="font-heading text-xl tracking-tight">
                    Completed orders
                  </CardTitle>
                  <CardDescription className="font-sans text-sm">Last 12 weeks</CardDescription>
                </div>
                {completedDeltaShow ? (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 font-sans text-sm font-semibold tabular-nums',
                      data.ordersCompletedDelta >= 0 ? 'text-success' : 'text-destructive'
                    )}
                  >
                    <TrendingUp className="size-4" aria-hidden />
                    {completedDeltaText}
                  </span>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="pb-section">
              <WeeklyTrendChart counts={data.weeklyCompletedCounts} />
            </CardContent>
          </Card>

          <Card className="border-border rounded-2xl shadow-none">
            <CardHeader className="gap-inset border-border [.border-b]:pb-section border-b">
              <div className="gap-inset flex items-start justify-between">
                <CardTitle className="font-heading text-xl tracking-tight">
                  Sites awaiting review
                </CardTitle>
                <span
                  className="text-primary-ink bg-primary/15 inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-sans text-xs font-semibold tabular-nums"
                  title="Sourcer submissions to review"
                >
                  <Users className="size-3" aria-hidden />
                  {data.sitesPendingReview}
                </span>
              </div>
            </CardHeader>
            <CardContent className="pb-section">
              <Link
                href="/sites?status=pending"
                className="text-primary inline-flex items-center gap-1 font-sans text-sm font-medium hover:underline"
              >
                Review pending sites
                <ArrowUpRight className="size-4" aria-hidden />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
