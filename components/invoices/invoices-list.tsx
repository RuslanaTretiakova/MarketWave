'use client'

import Link from 'next/link'
import { Filter, Receipt, RotateCcw } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import { InvoiceStatusBadge } from '@/components/invoices/invoice-status-badge'
import { StatementCard } from '@/components/invoices/statement-card'
import { SettingsTablePagination } from '@/components/settings/settings-table-pagination'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FilterInput, FilterSelect } from '@/components/ui/filter-bar'
import { PageHeader } from '@/components/ui/page-header'
import { SearchField } from '@/components/ui/search-field'
import {
  INVOICE_STATUS_LABEL,
  INVOICE_STATUSES_ORDERED,
} from '@/lib/invoices/invoice-status-labels'
import type { InvoiceListRow, InvoiceStatus } from '@/lib/invoices/load-invoices'
import type { Database } from '@/lib/supabase/types'
import { SETTINGS_TABLE_PAGE_SIZE } from '@/lib/pagination/constants'
import { cn } from '@/lib/utils'

const SEARCH_DEBOUNCE_MS = 320

type InvoicesView = 'statement' | 'invoice'

function buildHref(
  pathname: string,
  params: {
    page?: number
    client?: string
    status?: string
    billingPeriod?: string
    invoiceNumber?: string
    minAmount?: string
    maxAmount?: string
    view?: InvoicesView
  }
): string {
  const sp = new URLSearchParams()
  if (params.client) sp.set('client', params.client)
  if (params.status) sp.set('status', params.status)
  if (params.billingPeriod) sp.set('billingPeriod', params.billingPeriod)
  if (params.invoiceNumber) sp.set('invoiceNumber', params.invoiceNumber)
  if (params.minAmount) sp.set('minAmount', params.minAmount)
  if (params.maxAmount) sp.set('maxAmount', params.maxAmount)
  if (params.page && params.page > 1) sp.set('page', String(params.page))
  if (params.view === 'invoice') sp.set('view', 'invoice')
  const qs = sp.toString()
  return qs ? `${pathname}?${qs}` : pathname
}

export function InvoicesList({
  role,
  rows,
  totalCount,
  page,
  client,
  status,
  billingPeriod,
  invoiceNumber,
  minAmount,
  maxAmount,
}: {
  role: Database['public']['Enums']['user_role']
  rows: InvoiceListRow[]
  totalCount: number
  page: number
  client: string
  status?: InvoiceStatus
  billingPeriod?: string
  invoiceNumber?: string
  minAmount?: string
  maxAmount?: string
}) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isStaff = role === 'admin' || role === 'manager'
  const view: InvoicesView = searchParams.get('view') === 'invoice' ? 'invoice' : 'statement'
  const [localBillingPeriod, setLocalBillingPeriod] = useState(billingPeriod ?? '')
  const [localMinAmount, setLocalMinAmount] = useState(minAmount ?? '')
  const [localMaxAmount, setLocalMaxAmount] = useState(maxAmount ?? '')

  useEffect(() => {
    function onPopState() {
      const sp = new URLSearchParams(window.location.search)
      setLocalBillingPeriod(sp.get('billingPeriod') ?? '')
      setLocalMinAmount(sp.get('minAmount') ?? '')
      setLocalMaxAmount(sp.get('maxAmount') ?? '')
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    const next = localBillingPeriod.trim()
    if (next === (billingPeriod ?? '').trim()) return
    const id = window.setTimeout(() => {
      router.replace(
        buildHref(pathname, {
          client,
          status,
          billingPeriod: next || undefined,
          invoiceNumber,
          minAmount,
          maxAmount,
        }),
        { scroll: false }
      )
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(id)
  }, [
    localBillingPeriod,
    billingPeriod,
    client,
    status,
    invoiceNumber,
    minAmount,
    maxAmount,
    pathname,
    router,
  ])

  useEffect(() => {
    const next = localMinAmount.trim()
    if (next === (minAmount ?? '').trim()) return
    const id = window.setTimeout(() => {
      router.replace(
        buildHref(pathname, {
          client,
          status,
          billingPeriod,
          invoiceNumber,
          minAmount: next || undefined,
          maxAmount: localMaxAmount.trim() || undefined,
        }),
        { scroll: false }
      )
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(id)
  }, [
    localMinAmount,
    minAmount,
    localMaxAmount,
    client,
    status,
    billingPeriod,
    invoiceNumber,
    pathname,
    router,
  ])

  useEffect(() => {
    const next = localMaxAmount.trim()
    if (next === (maxAmount ?? '').trim()) return
    const id = window.setTimeout(() => {
      router.replace(
        buildHref(pathname, {
          client,
          status,
          billingPeriod,
          invoiceNumber,
          minAmount: localMinAmount.trim() || undefined,
          maxAmount: next || undefined,
        }),
        { scroll: false }
      )
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(id)
  }, [
    localMaxAmount,
    maxAmount,
    localMinAmount,
    client,
    status,
    billingPeriod,
    invoiceNumber,
    pathname,
    router,
  ])

  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    router.push(
      buildHref(pathname, {
        client,
        status: (e.target.value as InvoiceStatus) || undefined,
        billingPeriod,
        invoiceNumber,
        minAmount,
        maxAmount,
      })
    )
  }

  const availableStatuses =
    role === 'client'
      ? INVOICE_STATUSES_ORDERED.filter((s) => s !== 'draft')
      : INVOICE_STATUSES_ORDERED

  const isBillingPeriodApplied = Boolean(billingPeriod)
  const hasAppliedFilters = Boolean(
    client || status || isBillingPeriodApplied || invoiceNumber || minAmount || maxAmount
  )

  const statements = useMemo(() => {
    const map = new Map<string, InvoiceListRow[]>()
    for (const row of rows) {
      const key = `${row.client_id}::${row.billing_month}`
      const bucket = map.get(key) ?? []
      bucket.push(row)
      map.set(key, bucket)
    }
    return Array.from(map.entries()).map(([key, invoices]) => ({ key, invoices }))
  }, [rows])

  function switchView(next: InvoicesView) {
    if (next === view) return
    router.push(
      buildHref(pathname, {
        client,
        status,
        billingPeriod,
        invoiceNumber,
        minAmount,
        maxAmount,
        view: next,
      }),
      { scroll: false }
    )
  }

  return (
    <div className="gap-layout mx-auto flex max-w-6xl flex-col">
      <PageHeader
        title="Invoices"
        description={
          role === 'client'
            ? 'View and download invoices for your orders.'
            : 'View, filter, and manage every invoice across the platform.'
        }
        action={
          isStaff ? (
            <div className="gap-inset flex w-full min-w-0 flex-row items-center sm:w-auto sm:flex-wrap sm:justify-end">
              <SearchField
                name="client"
                placeholder="Filter by client…"
                ariaLabel="Filter by client"
              />
            </div>
          ) : undefined
        }
      />

      <section className="border-border/60 bg-card shadow-soft sticky top-14 z-30 overflow-hidden rounded-2xl border">
        <div className="px-section py-block gap-block flex flex-col">
          <div className="gap-inset flex items-end overflow-x-auto sm:flex-wrap">
            <div className="text-muted-foreground gap-inset mb-0.5 flex shrink-0 items-center text-xs font-medium">
              <Filter className="size-3.5 shrink-0" aria-hidden />
              <span>Filters</span>
            </div>
            <div className="flex shrink-0 flex-col gap-0.5">
              <span className="text-muted-foreground px-1 text-[10px] font-medium">Status</span>
              <FilterSelect
                aria-label="Filter by status"
                value={status ?? ''}
                onChange={handleStatusChange}
                className="h-8 w-auto max-w-32 min-w-0 rounded-full px-1 text-xs"
              >
                <option value="">All statuses</option>
                {availableStatuses.map((s) => (
                  <option key={s} value={s}>
                    {INVOICE_STATUS_LABEL[s]}
                  </option>
                ))}
              </FilterSelect>
            </div>
            <div className="flex shrink-0 flex-col gap-0.5">
              <span className="text-muted-foreground px-1 text-[10px] font-medium">
                Billing period
              </span>
              <FilterInput
                aria-label="Billing period"
                type="month"
                value={localBillingPeriod}
                onChange={(e) => setLocalBillingPeriod(e.target.value)}
                className="h-8 w-auto max-w-32 min-w-0 rounded-full px-1 text-xs"
              />
            </div>
            <div className="flex shrink-0 flex-col gap-0.5">
              <span className="text-muted-foreground px-1 text-[10px] font-medium">Invoice #</span>
              <SearchField
                name="invoiceNumber"
                placeholder="Search…"
                ariaLabel="Invoice number"
                className="w-28 flex-none"
                inputClassName="h-8 rounded-full px-3 text-xs"
                withIcon={false}
              />
            </div>
            <div className="flex shrink-0 flex-col gap-0.5">
              <span className="text-muted-foreground px-1 text-[10px] font-medium">Amount ($)</span>
              <div className="gap-inset flex">
                <FilterInput
                  aria-label="Minimum amount"
                  type="number"
                  value={localMinAmount}
                  onChange={(e) => setLocalMinAmount(e.target.value)}
                  placeholder="Min"
                  className="h-8 w-20 rounded-full px-3 text-xs"
                  min="0"
                  step="0.01"
                />
                <FilterInput
                  aria-label="Maximum amount"
                  type="number"
                  value={localMaxAmount}
                  onChange={(e) => setLocalMaxAmount(e.target.value)}
                  placeholder="Max"
                  className="h-8 w-20 rounded-full px-3 text-xs"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            {hasAppliedFilters ? (
              <Link
                href={view === 'invoice' ? '/invoices?view=invoice' : '/invoices'}
                scroll={false}
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'sm' }),
                  'ml-auto h-8 shrink-0 gap-2 self-end rounded-full px-3 text-xs'
                )}
              >
                <RotateCcw className="size-3.5" aria-hidden />
                Clear filters
              </Link>
            ) : null}
          </div>
          <div className="flex items-center justify-between">
            <div
              className="bg-muted flex shrink-0 gap-0.5 rounded-full p-0.5"
              role="tablist"
              aria-label="View mode"
            >
              {(['statement', 'invoice'] as InvoicesView[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  role="tab"
                  aria-selected={view === v}
                  onClick={() => switchView(v)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                    view === v
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {v === 'statement' ? 'By statement' : 'By invoice'}
                </button>
              ))}
            </div>
            <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
              {totalCount} invoice{totalCount === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      </section>

      {rows.length === 0 ? (
        <Card className="py-hero gap-block flex flex-col items-center text-center">
          <Receipt className="text-muted-foreground size-10" />
          <div className="space-y-inset">
            <p className="text-foreground font-semibold">
              {view === 'statement' ? 'No statements match your filters.' : 'No invoices found'}
            </p>
            <p className="text-muted-foreground text-sm">
              {client || status || billingPeriod
                ? 'Try adjusting your filters.'
                : 'Invoices are generated automatically each month for published orders.'}
            </p>
          </div>
        </Card>
      ) : view === 'statement' ? (
        <div className="gap-block flex flex-col">
          {statements.map((s, idx) => (
            <StatementCard
              key={s.key}
              invoices={s.invoices}
              role={role}
              defaultExpanded={idx === 0}
            />
          ))}
          <SettingsTablePagination
            page={page}
            pageSize={SETTINGS_TABLE_PAGE_SIZE}
            totalCount={totalCount}
            buildHref={(p) =>
              buildHref(pathname, {
                client,
                status,
                billingPeriod,
                invoiceNumber,
                minAmount,
                maxAmount,
                view,
                page: p,
              })
            }
          />
        </div>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-border border-b">
                  {isStaff ? (
                    <th className="text-muted-foreground px-section py-block text-left font-medium">
                      Client
                    </th>
                  ) : null}
                  <th className="text-muted-foreground px-section py-block text-left font-medium">
                    Invoice #
                  </th>
                  <th className="text-muted-foreground px-section py-block text-left font-medium">
                    Billing period
                  </th>
                  <th className="text-muted-foreground px-section py-block text-left font-medium">
                    Status
                  </th>
                  <th className="text-muted-foreground px-section py-block text-center font-medium">
                    Orders
                  </th>
                  <th className="text-muted-foreground px-section py-block text-right font-medium">
                    Total
                  </th>
                  <th className="text-muted-foreground px-section py-block text-right font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-border hover:bg-muted/30 border-b last:border-b-0"
                  >
                    {isStaff ? (
                      <td className="text-muted-foreground px-section py-block">
                        {row.client_name ?? '—'}
                        {row.client_email && (
                          <p className="text-muted-foreground/80 text-xs">{row.client_email}</p>
                        )}
                      </td>
                    ) : null}
                    <td className="px-section py-block font-mono text-sm">
                      {row.invoice_number ?? '—'}
                    </td>
                    <td className="px-section py-block">
                      <Link
                        href={`/invoices/${row.id}`}
                        className="text-foreground font-medium hover:underline"
                      >
                        {row.billing_period_label}
                      </Link>
                    </td>
                    <td className="px-section py-block">
                      <InvoiceStatusBadge status={row.status} />
                    </td>
                    <td className="text-muted-foreground px-section py-block text-center tabular-nums">
                      {row.items_count}
                    </td>
                    <td className="text-foreground px-section py-block text-right font-semibold tabular-nums">
                      ${row.total.toFixed(2)}
                    </td>
                    <td className="px-section py-block text-right">
                      <Link
                        href={`/invoices/${row.id}`}
                        className={buttonVariants({ variant: 'outline', size: 'sm' })}
                      >
                        View
                      </Link>
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
            buildHref={(p) =>
              buildHref(pathname, {
                client,
                status,
                billingPeriod,
                invoiceNumber,
                minAmount,
                maxAmount,
                view,
                page: p,
              })
            }
          />
        </Card>
      )}
    </div>
  )
}
