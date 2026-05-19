'use client'
import { useState } from 'react'
import { ChevronDown, ClipboardList, Filter, Link2, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

import { OrderActionsMenu } from '@/components/orders/order-actions-menu'
import { OrderStatusBadge } from '@/components/orders/order-status-badge'
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
import type { ClientOption } from '@/lib/orders/load-client-options'
import type { CopywriterOption } from '@/lib/orders/load-copywriter-options'
import { SETTINGS_TABLE_PAGE_SIZE } from '@/lib/pagination/constants'
import type { OrderListRow, OrderStatus, UserRole } from '@/lib/orders/load-orders'
import { ORDER_STATUS_LABEL, ORDER_STATUSES_ORDERED } from '@/lib/orders/order-status-labels'
import { cn } from '@/lib/utils'

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

  const [isOpen, setIsOpen] = useState(() =>
    Boolean(status || copywriterId || clientId || publishDate || invoiceStatus)
  )
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
      <PageHeader
        title="All orders"
        description="Open an order to view details, edit (when new), or review content when it has been sent."
        action={
          <div className="gap-inset flex w-full min-w-0 flex-row items-center sm:w-auto sm:flex-wrap sm:justify-end">
            <SearchField
              name="q"
              placeholder="Search by domain or order ID…"
              ariaLabel="Search orders"
            />
          </div>
        }
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
          <span className="text-muted-foreground ml-auto shrink-0 self-end pb-0.5 text-xs tabular-nums">
            {totalCount} order{totalCount === 1 ? '' : 's'}
          </span>
        </div>
        <div
          className={cn(
            'overflow-hidden transition-all duration-300',
            isOpen ? 'max-h-125 opacity-100' : 'max-h-0 opacity-0'
          )}
        >
          <div className="px-section pb-block gap-inset flex items-end overflow-x-auto sm:flex-wrap">
            <div className="flex shrink-0 flex-col gap-0.5">
              <span className="text-muted-foreground px-1 text-[10px] font-medium">
                Order status
              </span>
              <FilterSelect
                aria-label="Filter by order status"
                value={status ?? ''}
                onChange={(e) => navigateFilter({ status: e.target.value })}
                className="h-8 w-auto max-w-32 min-w-0 rounded-full px-1 text-xs"
              >
                {statusFilters.map(({ key, label }) => (
                  <option key={key} value={key === 'all' ? '' : key}>
                    {label}
                  </option>
                ))}
              </FilterSelect>
            </div>
            <div className="flex shrink-0 flex-col gap-0.5">
              <span className="text-muted-foreground px-1 text-[10px] font-medium">
                Invoice status
              </span>
              <FilterSelect
                aria-label="Filter by invoice status"
                value={invoiceStatus ?? ''}
                onChange={(e) => navigateFilter({ invoiceStatus: e.target.value })}
                className="h-8 w-auto max-w-32 min-w-0 rounded-full px-1 text-xs"
              >
                {invoiceStatusFilters.map(({ key, label }) => (
                  <option key={key} value={key === 'all' ? '' : key}>
                    {label}
                  </option>
                ))}
              </FilterSelect>
            </div>
            {showClientFilter && (
              <div className="flex shrink-0 flex-col gap-0.5">
                <span className="text-muted-foreground px-1 text-[10px] font-medium">Client</span>
                <FilterSelect
                  aria-label="Filter by client"
                  value={clientId ?? ''}
                  onChange={(e) => navigateFilter({ client: e.target.value })}
                  className="h-8 w-auto max-w-32 min-w-0 rounded-full px-1 text-xs"
                >
                  <option value="">All clients</option>
                  {(clientOptions ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name ?? c.email ?? c.id.slice(0, 8)}
                    </option>
                  ))}
                </FilterSelect>
              </div>
            )}
            {showCopywriterFilter && (
              <div className="flex shrink-0 flex-col gap-0.5">
                <span className="text-muted-foreground px-1 text-[10px] font-medium">
                  Copywriter
                </span>
                <FilterSelect
                  aria-label="Filter by copywriter"
                  value={copywriterId ?? ''}
                  onChange={(e) => navigateFilter({ copywriter: e.target.value })}
                  className="h-8 w-auto max-w-32 min-w-0 rounded-full px-1 text-xs"
                >
                  <option value="">All copywriters</option>
                  {(copywriterOptions ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name ?? c.email ?? c.id.slice(0, 8)}
                    </option>
                  ))}
                </FilterSelect>
              </div>
            )}
            <div className="flex shrink-0 flex-col gap-0.5">
              <span className="text-muted-foreground px-1 text-[10px] font-medium">
                Publish date
              </span>
              <FilterInput
                aria-label="Filter by publish date"
                type="date"
                value={publishDate ?? ''}
                onChange={(e) => navigateFilter({ publishDate: e.target.value })}
                className="h-8 w-auto rounded-full px-3 text-xs"
              />
            </div>
            {!!(q || status || invoiceStatus || copywriterId || clientId || publishDate) ? (
              <Link
                href="/orders"
                scroll={false}
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'sm' }),
                  'h-8 shrink-0 gap-2 self-end rounded-full px-3 text-xs'
                )}
              >
                <RotateCcw className="size-3.5" aria-hidden />
                Clear filters
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {rows.length === 0 ? (
        <Card className="py-hero gap-block flex flex-col items-center text-center">
          <span className="bg-primary-soft text-primary-ink flex size-14 items-center justify-center rounded-full">
            <ClipboardList className="size-7" aria-hidden />
          </span>
          <div className="space-y-inset">
            <p className="text-foreground font-semibold">No orders found</p>
            <p className="text-muted-foreground text-sm">
              {q || status || copywriterId || clientId || publishDate || invoiceStatus
                ? 'Try adjusting your filters or clearing search.'
                : 'Orders will appear here once placed.'}
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
                    Order #
                  </th>
                  <th className="text-muted-foreground px-section py-block text-left font-medium">
                    Domain
                  </th>
                  <th className="text-muted-foreground px-section py-block text-left font-medium">
                    Status
                  </th>
                  {showClientColumn ? (
                    <th className="text-muted-foreground px-section py-block text-left font-medium">
                      Client
                    </th>
                  ) : null}
                  <th className="text-muted-foreground px-section py-block text-left font-medium">
                    Copywriter
                  </th>
                  <th className="text-muted-foreground px-section py-block text-left font-medium">
                    Invoice
                  </th>
                  <th className="text-muted-foreground px-section py-block text-right font-medium">
                    Price
                  </th>
                  <th className="text-muted-foreground px-section py-block text-right font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-border hover:bg-muted/30 border-b last:border-b-0"
                  >
                    <td className="px-section py-block font-mono text-xs">
                      <Link
                        href={`/orders/${row.id}`}
                        className="text-foreground font-medium hover:underline"
                      >
                        #{row.id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-section py-block">
                      <Link
                        href={`/orders/${row.id}`}
                        className="text-primary inline-flex items-center gap-1 hover:underline"
                      >
                        <Link2 className="size-3 shrink-0" aria-hidden />
                        {row.site_domain}
                      </Link>
                      {row.publish_date ? (
                        <p className="text-muted-foreground text-xs">{row.publish_date}</p>
                      ) : null}
                    </td>
                    <td className="px-section py-block">
                      <OrderStatusBadge status={row.status} role={role} />
                    </td>
                    {showClientColumn ? (
                      <td className="text-muted-foreground px-section py-block">
                        {row.client_name ?? '—'}
                      </td>
                    ) : null}
                    <td className="text-muted-foreground px-section py-block">
                      {row.copywriter_name ?? '—'}
                    </td>
                    <td className="text-muted-foreground px-section py-block">
                      {row.invoice_status ? INVOICE_STATUS_LABEL[row.invoice_status] : '—'}
                    </td>
                    <td className="text-foreground px-section py-block text-right font-semibold tabular-nums">
                      ${row.price.toFixed(2)}
                    </td>
                    <td
                      className="px-section py-block text-right"
                      onClick={(e) => e.stopPropagation()}
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
                        initialPublishDate={row.publish_date}
                        initialPublishMonth={row.publish_month}
                        initialAnchorText={row.anchor_text}
                        initialTargetUrl={row.target_url}
                        initialClientNotes={row.client_notes}
                        siteDomain={row.site_domain}
                        price={row.price}
                      />
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
        </Card>
      )}
    </div>
  )
}
