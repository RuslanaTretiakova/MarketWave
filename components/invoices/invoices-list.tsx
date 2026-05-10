'use client'

import Link from 'next/link'
import { Receipt } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { SettingsTablePagination } from '@/components/settings/settings-table-pagination'
import { Button } from '@/components/ui/button'
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

function formatDateUtc(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toISOString().slice(0, 10)
}

function buildHref(
  pathname: string,
  params: { page?: number; q?: string; status?: string; dueFrom?: string; dueTo?: string }
): string {
  const sp = new URLSearchParams()
  if (params.q) sp.set('q', params.q)
  if (params.status) sp.set('status', params.status)
  if (params.dueFrom) sp.set('dueFrom', params.dueFrom)
  if (params.dueTo) sp.set('dueTo', params.dueTo)
  if (params.page && params.page > 1) sp.set('page', String(params.page))
  const qs = sp.toString()
  return qs ? `${pathname}?${qs}` : pathname
}

export function InvoicesList({
  role,
  rows,
  totalCount,
  page,
  q,
  status,
  dueFrom,
  dueTo,
}: {
  role: Database['public']['Enums']['user_role']
  rows: InvoiceListRow[]
  totalCount: number
  page: number
  q: string
  status?: InvoiceStatus
  dueFrom?: string
  dueTo?: string
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [localQ, setLocalQ] = useState(q)
  const [localFrom, setLocalFrom] = useState(dueFrom ?? '')
  const [localTo, setLocalTo] = useState(dueTo ?? '')

  useEffect(() => {
    function onPopState() {
      const sp = new URLSearchParams(window.location.search)
      setLocalQ(sp.get('q') ?? '')
      setLocalFrom(sp.get('dueFrom') ?? '')
      setLocalTo(sp.get('dueTo') ?? '')
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    const trimmed = localQ.trim()
    if (trimmed === q.trim()) return
    const id = window.setTimeout(() => {
      const next = localQ.trim()
      if (next === q.trim()) return
      router.replace(
        buildHref(pathname, {
          q: next || undefined,
          status,
          dueFrom,
          dueTo,
        }),
        { scroll: false }
      )
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(id)
  }, [localQ, q, pathname, router, status, dueFrom, dueTo])

  function clearSearch() {
    setLocalQ('')
    router.replace(buildHref(pathname, { status, dueFrom, dueTo }), { scroll: false })
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    router.push(
      buildHref(pathname, {
        q: localQ.trim(),
        status,
        dueFrom: localFrom.trim() || undefined,
        dueTo: localTo.trim() || undefined,
      })
    )
  }

  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    router.push(
      buildHref(pathname, {
        q,
        status: (e.target.value as InvoiceStatus) || undefined,
        dueFrom,
        dueTo,
      })
    )
  }

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

      <form onSubmit={handleSubmit} className="gap-block flex flex-col sm:flex-row sm:flex-wrap">
        <div className="gap-inset flex min-w-[220px] flex-1">
          <FilterInput
            name="q"
            type="search"
            value={localQ}
            onChange={(e) => setLocalQ(e.target.value)}
            placeholder="Search by domain…"
            className="flex-1"
            autoComplete="off"
          />
          {localQ ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearSearch}
              aria-label="Clear search"
            >
              Clear
            </Button>
          ) : null}
          <Button variant="outline" size="sm" type="submit">
            Apply
          </Button>
        </div>
        <FilterSelect value={status ?? ''} onChange={handleStatusChange}>
          <option value="">All statuses</option>
          {INVOICE_STATUSES_ORDERED.map((s) => (
            <option key={s} value={s}>
              {INVOICE_STATUS_LABEL[s]}
            </option>
          ))}
        </FilterSelect>
        <label className="gap-inset flex items-center text-sm">
          <span className="text-muted-foreground">Due from</span>
          <FilterInput
            type="date"
            value={localFrom}
            onChange={(e) => setLocalFrom(e.target.value)}
          />
        </label>
        <label className="gap-inset flex items-center text-sm">
          <span className="text-muted-foreground">to</span>
          <FilterInput type="date" value={localTo} onChange={(e) => setLocalTo(e.target.value)} />
        </label>
      </form>

      {rows.length === 0 ? (
        <Card className="py-hero gap-block flex flex-col items-center text-center">
          <Receipt className="text-muted-foreground size-10" />
          <div className="space-y-inset">
            <p className="text-foreground font-semibold">No invoices found</p>
            <p className="text-muted-foreground text-sm">
              {q || status || dueFrom || dueTo
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
                  <th className="text-muted-foreground px-section py-block text-left font-medium">
                    Domain
                  </th>
                  <th className="text-muted-foreground px-section py-block text-left font-medium">
                    Client
                  </th>
                  <th className="text-muted-foreground px-section py-block text-left font-medium">
                    Status
                  </th>
                  <th className="text-muted-foreground px-section py-block text-right font-medium">
                    Amount
                  </th>
                  <th className="text-muted-foreground px-section py-block hidden text-left font-medium sm:table-cell">
                    Due date
                  </th>
                  <th className="text-muted-foreground px-section py-block hidden text-left font-medium md:table-cell">
                    Billing month
                  </th>
                  <th className="text-muted-foreground px-section py-block hidden text-left font-medium md:table-cell">
                    Sent
                  </th>
                  <th className="text-muted-foreground px-section py-block hidden text-left font-medium md:table-cell">
                    Paid
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-border hover:bg-muted/30 border-b last:border-b-0"
                  >
                    <td className="px-section py-block">
                      <Link
                        href={`/invoices/${row.id}`}
                        className="text-foreground font-medium hover:underline"
                      >
                        {row.site_domain}
                      </Link>
                    </td>
                    <td className="text-muted-foreground px-section py-block">
                      {row.client_name ?? '—'}
                      {row.client_email && (
                        <p className="text-muted-foreground/80 text-xs">{row.client_email}</p>
                      )}
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
                    <td className="text-muted-foreground px-section py-block hidden sm:table-cell">
                      {row.due_date ?? '—'}
                    </td>
                    <td className="text-muted-foreground px-section py-block hidden md:table-cell">
                      {row.billing_month ? row.billing_month.slice(0, 7) : '—'}
                    </td>
                    <td className="text-muted-foreground px-section py-block hidden md:table-cell">
                      {formatDateUtc(row.sent_at)}
                    </td>
                    <td className="text-muted-foreground px-section py-block hidden md:table-cell">
                      {formatDateUtc(row.paid_at)}
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
            buildHref={(p) => buildHref(pathname, { q, status, dueFrom, dueTo, page: p })}
          />
        </Card>
      )}
    </div>
  )
}
