'use client'

import { ChevronDown, ChevronLeft, ChevronRight, Filter, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, type ChangeEvent } from 'react'

import { PayoutStatusBadge } from '@/components/earnings/payout-status-badge'
import { OrderStatusBadge } from '@/components/orders/order-status-badge'
import { SettingsTablePagination } from '@/components/settings/settings-table-pagination'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FilterInput, FilterSelect } from '@/components/ui/filter-bar'
import { PageHeader } from '@/components/ui/page-header'
import {
  shiftMonth,
  type EarningsRow,
  type EarningsSummary,
  type SourcerFilterOption,
} from '@/lib/earnings/load-earnings'
import type { OrderStatus } from '@/lib/orders/order-status-labels'
import { SETTINGS_TABLE_PAGE_SIZE } from '@/lib/pagination/constants'
import { cn } from '@/lib/utils'
import type { Database } from '@/lib/supabase/types'

function money(v: number): string {
  return `$${v.toFixed(2)}`
}

type UserRole = Database['public']['Enums']['user_role']

function buildHref(
  pathname: string,
  params: { month: string; sourcerId?: string | null; page?: number }
): string {
  const sp = new URLSearchParams()
  sp.set('month', params.month)
  if (params.sourcerId) sp.set('sourcerId', params.sourcerId)
  if (params.page && params.page > 1) sp.set('page', String(params.page))
  return `${pathname}?${sp.toString()}`
}

export function EarningsView({
  title,
  role,
  month,
  selectedSourcerId,
  sourcerOptions,
  summary,
  rows,
  totalCount,
  page,
}: {
  title: string
  role: UserRole
  month: string
  selectedSourcerId: string | null
  sourcerOptions: SourcerFilterOption[]
  summary: EarningsSummary
  rows: EarningsRow[]
  totalCount: number
  page: number
}) {
  const pathname = usePathname()
  const router = useRouter()
  const canFilterBySourcer = role === 'admin'
  const [isOpen, setIsOpen] = useState(false)

  function handleSourcerChange(e: ChangeEvent<HTMLSelectElement>) {
    router.push(buildHref(pathname, { month, sourcerId: e.target.value || null }))
  }

  function handleMonthChange(e: ChangeEvent<HTMLInputElement>) {
    if (!e.target.value) return
    router.push(
      buildHref(pathname, {
        month: e.target.value,
        sourcerId: canFilterBySourcer ? selectedSourcerId : null,
      })
    )
  }

  function handleShift(delta: number) {
    router.push(
      buildHref(pathname, {
        month: shiftMonth(month, delta),
        sourcerId: canFilterBySourcer ? selectedSourcerId : null,
      })
    )
  }

  return (
    <div className="gap-layout flex flex-col">
      <PageHeader
        title={title}
        description="Earnings are calculated as your commission on published and completed orders in the selected month."
      />

      <section className="border-border/60 bg-card shadow-soft sticky top-14 z-30 overflow-hidden rounded-2xl border">
        <div className="px-section py-block gap-inset flex items-center sm:flex-wrap">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-muted-foreground gap-inset mb-0.5 flex shrink-0 items-center text-xs font-medium"
          >
            <Filter className="size-3.5 shrink-0" aria-hidden />
            <span>Filters</span>
            <ChevronDown
              className={cn(
                'size-3.5 shrink-0 transition-transform duration-200 ease-in-out',
                isOpen && 'rotate-180'
              )}
              aria-hidden
            />
          </button>
        </div>
        <div
          className={cn(
            'overflow-hidden transition-all duration-300',
            isOpen ? 'max-h-125 opacity-100' : 'max-h-0 opacity-0'
          )}
        >
          <div className="px-section pb-block gap-inset flex items-end overflow-x-auto sm:flex-wrap">
            <div className="flex shrink-0 flex-col gap-0.5">
              <span className="text-muted-foreground px-1 text-[10px] font-medium">Month</span>
              <FilterInput
                type="month"
                value={month}
                onChange={handleMonthChange}
                className="h-8 w-auto max-w-32 min-w-0 rounded-full px-1 text-xs"
                aria-label="Month"
              />
            </div>
            {canFilterBySourcer ? (
              <div className="flex shrink-0 flex-col gap-0.5">
                <span className="text-muted-foreground px-1 text-[10px] font-medium">Sourcer</span>
                <FilterSelect
                  value={selectedSourcerId ?? ''}
                  onChange={handleSourcerChange}
                  className="h-8 w-auto max-w-32 min-w-0 rounded-full px-1 text-xs"
                  aria-label="Filter by sourcer"
                >
                  <option value="">All sourcers</option>
                  {sourcerOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </FilterSelect>
              </div>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1 self-end rounded-full px-3 text-xs"
              onClick={() => handleShift(-1)}
            >
              <ChevronLeft className="size-3.5" aria-hidden />
              Prev
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1 self-end rounded-full px-3 text-xs"
              onClick={() => handleShift(1)}
            >
              Next
              <ChevronRight className="size-3.5" aria-hidden />
            </Button>
            {canFilterBySourcer && !!selectedSourcerId ? (
              <Link
                href="/earnings"
                scroll={false}
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'sm' }),
                  'gap-inset px-block h-8 shrink-0 self-end rounded-full text-xs'
                )}
              >
                <RotateCcw className="size-3.5" aria-hidden />
                Clear filters
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <div className="gap-block grid sm:grid-cols-2">
        <Card className="p-section">
          <p className="text-muted-foreground text-sm">Total earnings</p>
          <p className="text-foreground mt-inset text-2xl font-semibold tabular-nums">
            {money(summary.totalEarnings)}
          </p>
        </Card>
        <Card className="p-section">
          <p className="text-muted-foreground text-sm">Orders count</p>
          <p className="text-foreground mt-inset text-2xl font-semibold tabular-nums">
            {summary.ordersCount}
          </p>
        </Card>
      </div>

      {rows.length === 0 ? (
        <Card className="py-hero gap-block flex flex-col items-center text-center">
          <p className="text-foreground font-semibold">No earnings this month</p>
          <p className="text-muted-foreground text-sm">
            Earnings appear here when your orders are published or completed.
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-border border-b">
                  {canFilterBySourcer && !selectedSourcerId ? (
                    <th className="text-muted-foreground px-section py-block text-left font-medium">
                      Sourcer
                    </th>
                  ) : null}
                  <th className="text-muted-foreground px-section py-block text-left font-medium">
                    Site
                  </th>
                  <th className="text-muted-foreground px-section py-block text-left font-medium">
                    Order status
                  </th>
                  <th className="text-muted-foreground px-section py-block text-left font-medium">
                    Publish date
                  </th>
                  <th className="text-muted-foreground px-section py-block text-right font-medium">
                    Order price
                  </th>
                  <th className="text-muted-foreground px-section py-block text-right font-medium">
                    Earned
                  </th>
                  <th className="text-muted-foreground px-section py-block text-left font-medium">
                    Payout
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-border hover:bg-muted/30 border-b last:border-b-0"
                  >
                    {canFilterBySourcer && !selectedSourcerId ? (
                      <td className="text-muted-foreground px-section py-block text-sm">
                        {row.sourcer_name ?? '—'}
                      </td>
                    ) : null}
                    <td className="px-section py-block font-medium">{row.site_domain}</td>
                    <td className="px-section py-block">
                      <OrderStatusBadge status={row.order_status as OrderStatus} />
                    </td>
                    <td className="text-muted-foreground px-section py-block">
                      {row.publish_date ?? '—'}
                    </td>
                    <td className="text-muted-foreground px-section py-block text-right tabular-nums">
                      {money(row.order_price)}
                    </td>
                    <td className="text-foreground px-section py-block text-right font-semibold tabular-nums">
                      {money(row.earned_amount)}
                      <p className="text-muted-foreground text-xs font-normal">
                        {(row.commission_rate * 100).toFixed(0)}%
                      </p>
                    </td>
                    <td className="px-section py-block">
                      <PayoutStatusBadge status={row.payout_status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <SettingsTablePagination
            page={page}
            pageSize={SETTINGS_TABLE_PAGE_SIZE}
            totalCount={totalCount}
            buildHref={(p) => buildHref(pathname, { month, sourcerId: selectedSourcerId, page: p })}
          />
        </Card>
      )}
    </div>
  )
}
