'use client'
import { ClipboardList, Filter, Link2, Search } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { OrderActionsMenu } from '@/components/orders/order-actions-menu'
import { SettingsTablePagination } from '@/components/settings/settings-table-pagination'
import { Button } from '@/components/ui/button'
import { FilterInput, FilterSelect } from '@/components/ui/filter-bar'
import {
  INVOICE_STATUS_LABEL,
  INVOICE_STATUSES_ORDERED,
} from '@/lib/invoices/invoice-status-labels'
import type { ClientOption } from '@/lib/orders/load-client-options'
import type { CopywriterOption } from '@/lib/orders/load-copywriter-options'
import { SETTINGS_TABLE_PAGE_SIZE } from '@/lib/pagination/constants'
import type { OrderListRow, OrderStatus, UserRole } from '@/lib/orders/load-orders'
import {
  ORDER_STATUS_CHIP,
  ORDER_STATUS_LABEL,
  ORDER_STATUSES_ORDERED,
} from '@/lib/orders/order-status-labels'
import { cn } from '@/lib/utils'

const SEARCH_DEBOUNCE_MS = 320

function buildHref(
  pathname: string,
  params: {
    page?: number
    q?: string
    status?: string
    copywriter?: string
    client?: string
    publishDate?: string
    invoiceStatus?: string
  }
): string {
  const sp = new URLSearchParams()
  if (params.q) sp.set('q', params.q)
  if (params.status) sp.set('status', params.status)
  if (params.copywriter) sp.set('copywriter', params.copywriter)
  if (params.client) sp.set('client', params.client)
  if (params.publishDate) sp.set('publishDate', params.publishDate)
  if (params.invoiceStatus) sp.set('invoiceStatus', params.invoiceStatus)
  if (params.page && params.page > 1) sp.set('page', String(params.page))
  const qs = sp.toString()
  return qs ? `${pathname}?${qs}` : pathname
}

export function OrdersList({
  role,
  userId,
  rows,
  totalCount,
  page,
  q,
  status,
  copywriterId,
  clientId,
  publishDate,
  invoiceStatus,
  copywriterOptions,
  clientOptions,
}: {
  role: UserRole
  userId: string
  rows: OrderListRow[]
  totalCount: number
  page: number
  q: string
  status?: OrderStatus
  copywriterId?: string
  clientId?: string
  publishDate?: string
  invoiceStatus?: (typeof INVOICE_STATUSES_ORDERED)[number]
  copywriterOptions?: CopywriterOption[]
  clientOptions?: ClientOption[]
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [searchDraft, setSearchDraft] = useState(q)

  useEffect(() => {
    function onPopState() {
      const sp = new URLSearchParams(window.location.search)
      setSearchDraft(sp.get('q') ?? '')
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    const trimmed = searchDraft.trim()
    if (trimmed === q.trim()) return
    const id = window.setTimeout(() => {
      const next = searchDraft.trim()
      if (next === q.trim()) return
      router.replace(
        buildHref(pathname, {
          q: next || undefined,
          status,
          copywriter: copywriterId,
          client: clientId,
          publishDate,
          invoiceStatus,
        }),
        { scroll: false }
      )
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(id)
  }, [searchDraft, q, pathname, router, status, copywriterId, clientId, publishDate, invoiceStatus])

  function clearSearch() {
    setSearchDraft('')
    router.replace(
      buildHref(pathname, {
        status,
        copywriter: copywriterId,
        client: clientId,
        publishDate,
        invoiceStatus,
      }),
      { scroll: false }
    )
  }

  const isStaff = role === 'admin' || role === 'manager'
  const showClientColumn = isStaff
  const showCopywriterFilter = isStaff && (copywriterOptions?.length ?? 0) > 0
  const showClientFilter = isStaff && (clientOptions?.length ?? 0) > 0

  function navigateFilter(updates: {
    status?: string
    copywriter?: string
    client?: string
    publishDate?: string
    invoiceStatus?: string
  }) {
    router.push(
      buildHref(pathname, {
        q,
        status: updates.status !== undefined ? updates.status || undefined : status,
        copywriter:
          updates.copywriter !== undefined ? updates.copywriter || undefined : copywriterId,
        client: updates.client !== undefined ? updates.client || undefined : clientId,
        publishDate:
          updates.publishDate !== undefined ? updates.publishDate || undefined : publishDate,
        invoiceStatus:
          updates.invoiceStatus !== undefined ? updates.invoiceStatus || undefined : invoiceStatus,
      }),
      { scroll: false }
    )
  }

  const statusFilters: { key: OrderStatus | 'all'; label: string }[] = [
    { key: 'all', label: 'All statuses' },
    ...ORDER_STATUSES_ORDERED.map((s) => ({ key: s as OrderStatus, label: ORDER_STATUS_LABEL[s] })),
  ]

  const invoiceStatusFilters: {
    key: (typeof INVOICE_STATUSES_ORDERED)[number] | 'all'
    label: string
  }[] = [
    { key: 'all', label: 'All invoices' },
    ...INVOICE_STATUSES_ORDERED.map((s) => ({ key: s, label: INVOICE_STATUS_LABEL[s] })),
  ]

  return (
    <div className="gap-layout mx-auto flex max-w-6xl flex-col">
      <section className="border-border/60 bg-card shadow-soft overflow-hidden rounded-2xl border">
        <header className="border-border/60 gap-block px-section py-block flex flex-col border-b sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-inset min-w-0">
            <h2 className="font-display text-foreground text-xl font-semibold tracking-tight">
              All orders
            </h2>
            <p className="text-muted-foreground max-w-xl text-xs leading-relaxed">
              Open an order to view details, edit (when new), or review content when it has been
              sent.
            </p>
          </div>
          <div className="gap-block flex w-full flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <form
              onSubmit={(e) => e.preventDefault()}
              className="relative w-full min-w-0 sm:max-w-xs sm:min-w-48 sm:flex-none"
            >
              <Search
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                aria-hidden
              />
              <FilterInput
                name="q"
                type="search"
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                placeholder="Search by domain or order ID…"
                className="pr-3 pl-10"
                autoComplete="off"
              />
            </form>
            {searchDraft ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 rounded-full px-4"
                onClick={clearSearch}
                aria-label="Clear search"
              >
                Clear
              </Button>
            ) : null}
          </div>
        </header>

        <div className="border-border/60 gap-inset py-block flex flex-wrap items-center border-b px-2">
          <Filter className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
          <FilterSelect
            value={status ?? ''}
            onChange={(e) => navigateFilter({ status: e.target.value })}
            className="w-auto"
          >
            {statusFilters.map(({ key, label }) => (
              <option key={key} value={key === 'all' ? '' : key}>
                {label}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            value={invoiceStatus ?? ''}
            onChange={(e) => navigateFilter({ invoiceStatus: e.target.value })}
            className="w-auto"
          >
            {invoiceStatusFilters.map(({ key, label }) => (
              <option key={key} value={key === 'all' ? '' : key}>
                {label}
              </option>
            ))}
          </FilterSelect>
          {showClientFilter && (
            <FilterSelect
              value={clientId ?? ''}
              onChange={(e) => navigateFilter({ client: e.target.value })}
              className="w-auto"
            >
              <option value="">All clients</option>
              {(clientOptions ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name ?? c.email ?? c.id.slice(0, 8)}
                </option>
              ))}
            </FilterSelect>
          )}
          {showCopywriterFilter && (
            <FilterSelect
              value={copywriterId ?? ''}
              onChange={(e) => navigateFilter({ copywriter: e.target.value })}
              className="w-auto"
            >
              <option value="">All copywriters</option>
              {(copywriterOptions ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name ?? c.email ?? c.id.slice(0, 8)}
                </option>
              ))}
            </FilterSelect>
          )}
          <FilterInput
            type="date"
            value={publishDate ?? ''}
            onChange={(e) => navigateFilter({ publishDate: e.target.value })}
            className="w-auto"
          />
          <span className="text-muted-foreground text-xs tabular-nums sm:ml-auto">
            {totalCount} order{totalCount === 1 ? '' : 's'}
          </span>
        </div>

        <div className="flex flex-col">
          {rows.length === 0 ? (
            <div className="px-section py-block">
              <div className="gap-block py-hero flex flex-col items-center text-center">
                <span className="bg-primary-soft text-primary-ink flex size-14 items-center justify-center rounded-full">
                  <ClipboardList className="size-7" aria-hidden />
                </span>
                <h3 className="font-display text-foreground text-lg font-semibold tracking-tight">
                  No orders found
                </h3>
                <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">
                  {q || status || copywriterId || clientId || publishDate || invoiceStatus
                    ? 'Try adjusting your filters or clearing search.'
                    : 'Orders will appear here once placed.'}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="gap-inset px-section py-block flex flex-col">
                {rows.map((row) => (
                  <Link
                    key={row.id}
                    href={`/orders/${row.id}`}
                    className="border-border/80 bg-background/60 hover:border-primary/25 group flex items-center justify-between rounded-xl border p-3 transition-[border-color,box-shadow] hover:shadow-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <p className="font-mono-ui text-muted-foreground text-[10px] tracking-wider uppercase">
                          Order #{row.id.slice(0, 8)}
                        </p>
                        <span className="text-foreground text-xs font-semibold tabular-nums">
                          ${row.price.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-foreground group-hover:text-primary mt-1 text-sm font-medium">
                        {row.site_category} {row.site_dr !== null ? `· DA ${row.site_dr}` : ''}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                        <span className="text-primary inline-flex items-center gap-1 text-xs">
                          <Link2 className="size-3 shrink-0" aria-hidden />
                          {row.site_domain}
                        </span>
                        {showClientColumn && row.client_name ? (
                          <span className="text-muted-foreground text-xs">{row.client_name}</span>
                        ) : null}
                        {showCopywriterFilter && row.copywriter_name ? (
                          <span className="text-muted-foreground text-xs">
                            {row.copywriter_name}
                          </span>
                        ) : null}
                        {row.publish_date ? (
                          <span className="text-muted-foreground text-xs">{row.publish_date}</span>
                        ) : null}
                        {row.invoice_status ? (
                          <span className="text-muted-foreground text-xs">
                            {INVOICE_STATUS_LABEL[row.invoice_status]}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wider uppercase',
                          ORDER_STATUS_CHIP[row.status]
                        )}
                      >
                        {ORDER_STATUS_LABEL[row.status]}
                      </span>
                      <span
                        onClick={(e) => e.preventDefault()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') e.preventDefault()
                        }}
                        role="presentation"
                      >
                        <OrderActionsMenu
                          context={{
                            role,
                            status: row.status,
                            userId,
                            orderUserId: row.user_id,
                            copywriterId: row.copywriter_id,
                          }}
                          orderId={row.id}
                          detailHref={`/orders/${row.id}`}
                          copywriterOptions={copywriterOptions}
                          siteDomain={row.site_domain}
                          price={row.price}
                        />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
              <SettingsTablePagination
                page={page}
                pageSize={SETTINGS_TABLE_PAGE_SIZE}
                totalCount={totalCount}
                buildHref={(p) =>
                  buildHref(pathname, {
                    q,
                    status,
                    copywriter: copywriterId,
                    client: clientId,
                    publishDate,
                    invoiceStatus,
                    page: p,
                  })
                }
              />
            </>
          )}
        </div>
      </section>
    </div>
  )
}
