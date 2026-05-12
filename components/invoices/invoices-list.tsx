'use client'

import Link from 'next/link'
import { Filter, Receipt, RotateCcw, Search } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { SettingsTablePagination } from '@/components/settings/settings-table-pagination'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FilterInput, FilterSelect } from '@/components/ui/filter-bar'
import { PageHeader } from '@/components/ui/page-header'
import {
  INVOICE_STATUS_CHIP,
  INVOICE_STATUS_LABEL,
  INVOICE_STATUSES_ORDERED,
} from '@/lib/invoices/invoice-status-labels'
import type { InvoiceListRow, InvoiceStatus } from '@/lib/invoices/load-invoices'
import type { Database } from '@/lib/supabase/types'
import { SETTINGS_TABLE_PAGE_SIZE } from '@/lib/pagination/constants'
import { cn } from '@/lib/utils'

const SEARCH_DEBOUNCE_MS = 320

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
  const isStaff = role === 'admin' || role === 'manager'
  const [localClient, setLocalClient] = useState(client)
  const [localBillingPeriod, setLocalBillingPeriod] = useState(billingPeriod ?? '')
  const [localInvoiceNumber, setLocalInvoiceNumber] = useState(invoiceNumber ?? '')
  const [localMinAmount, setLocalMinAmount] = useState(minAmount ?? '')
  const [localMaxAmount, setLocalMaxAmount] = useState(maxAmount ?? '')

  useEffect(() => {
    function onPopState() {
      const sp = new URLSearchParams(window.location.search)
      setLocalClient(sp.get('client') ?? '')
      setLocalBillingPeriod(sp.get('billingPeriod') ?? '')
      setLocalInvoiceNumber(sp.get('invoiceNumber') ?? '')
      setLocalMinAmount(sp.get('minAmount') ?? '')
      setLocalMaxAmount(sp.get('maxAmount') ?? '')
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    const trimmed = localClient.trim()
    if (trimmed === client.trim()) return
    const id = window.setTimeout(() => {
      const next = localClient.trim()
      if (next === client.trim()) return
      router.replace(
        buildHref(pathname, {
          client: next || undefined,
          status,
          billingPeriod,
        }),
        { scroll: false }
      )
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(id)
  }, [localClient, client, pathname, router, status, billingPeriod])

  function clearSearch() {
    setLocalClient('')
    router.replace(
      buildHref(pathname, { status, billingPeriod, invoiceNumber, minAmount, maxAmount }),
      { scroll: false }
    )
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    router.push(
      buildHref(pathname, {
        client: localClient.trim(),
        status,
        billingPeriod: localBillingPeriod.trim() || undefined,
        invoiceNumber: localInvoiceNumber.trim() || undefined,
        minAmount: localMinAmount.trim() || undefined,
        maxAmount: localMaxAmount.trim() || undefined,
      })
    )
  }

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

  return (
    <div className="space-y-layout mx-auto max-w-6xl">
      <PageHeader
        title="Invoices"
        description={
          role === 'client'
            ? 'View and download invoices for your orders.'
            : 'View, filter, and manage every invoice across the platform.'
        }
      />

      <div className="border-border/60 bg-card overflow-hidden rounded-2xl border">
        {isStaff ? (
          <div className="border-border/60 px-section py-block border-b">
            <div className="gap-inset flex items-center">
              <form onSubmit={(e) => e.preventDefault()} className="relative min-w-0 flex-1">
                <Search
                  className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                  aria-hidden
                />
                <FilterInput
                  name="client"
                  type="search"
                  value={localClient}
                  onChange={(e) => setLocalClient(e.target.value)}
                  placeholder="Filter by client…"
                  className="pr-3 pl-10"
                  autoComplete="off"
                />
              </form>
              {localClient ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-10 rounded-full px-4"
                  onClick={clearSearch}
                  aria-label="Clear client filter"
                >
                  Clear
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="px-section py-block border-border/60 bg-muted/20 border-b">
          <div className="text-muted-foreground gap-inset mb-inset flex items-center text-xs font-medium">
            <Filter className="size-3.5 shrink-0" aria-hidden />
            <span>Filters</span>
          </div>
          <form
            onSubmit={handleSubmit}
            className="gap-block flex flex-col sm:flex-row sm:flex-wrap sm:items-end"
          >
            <FilterSelect
              value={status ?? ''}
              onChange={handleStatusChange}
              className="h-10 sm:w-[180px]"
            >
              <option value="">All statuses</option>
              {availableStatuses.map((s) => (
                <option key={s} value={s}>
                  {INVOICE_STATUS_LABEL[s]}
                </option>
              ))}
            </FilterSelect>
            <FilterInput
              type="month"
              value={localBillingPeriod}
              onChange={(e) => setLocalBillingPeriod(e.target.value)}
              className="h-10 sm:w-[180px]"
            />
            <FilterInput
              type="search"
              value={localInvoiceNumber}
              onChange={(e) => setLocalInvoiceNumber(e.target.value)}
              placeholder="Invoice # (e.g. INV-2026-0001)"
              className="h-10 sm:w-[220px]"
              autoComplete="off"
            />
            <FilterInput
              type="number"
              value={localMinAmount}
              onChange={(e) => setLocalMinAmount(e.target.value)}
              placeholder="Min amount"
              className="h-10 sm:w-[130px]"
              min="0"
              step="0.01"
            />
            <FilterInput
              type="number"
              value={localMaxAmount}
              onChange={(e) => setLocalMaxAmount(e.target.value)}
              placeholder="Max amount"
              className="h-10 sm:w-[130px]"
              min="0"
              step="0.01"
            />
            <Button
              variant="outline"
              size="sm"
              type="submit"
              className="px-block h-10 rounded-full"
            >
              Apply
            </Button>
            {!!(client || status || billingPeriod || invoiceNumber || minAmount || maxAmount) ? (
              <Link
                href="/invoices"
                scroll={false}
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'sm' }),
                  'h-10 gap-2 rounded-full px-4'
                )}
              >
                <RotateCcw className="size-4" aria-hidden />
                Clear filters
              </Link>
            ) : null}
          </form>
        </div>
      </div>

      {rows.length === 0 ? (
        <Card className="py-hero gap-block flex flex-col items-center text-center">
          <Receipt className="text-muted-foreground size-10" />
          <div className="space-y-inset">
            <p className="text-foreground font-semibold">No invoices found</p>
            <p className="text-muted-foreground text-sm">
              {client || status || billingPeriod
                ? 'Try adjusting your filters.'
                : 'Invoices appear here automatically when an order is placed.'}
            </p>
          </div>
        </Card>
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
                  <th className="text-muted-foreground px-section py-block text-right font-medium">
                    Total amount
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
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                          INVOICE_STATUS_CHIP[row.status]
                        )}
                      >
                        {INVOICE_STATUS_LABEL[row.status]}
                      </span>
                    </td>
                    <td className="text-foreground px-section py-block text-right font-semibold tabular-nums">
                      ${row.amount.toFixed(2)}
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
                page: p,
              })
            }
          />
        </Card>
      )}
    </div>
  )
}
