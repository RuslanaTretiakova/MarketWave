'use client'

import Link from 'next/link'
import { ClipboardList } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'

import { SettingsTablePagination } from '@/components/settings/settings-table-pagination'
import { Card } from '@/components/ui/card'
import { SETTINGS_TABLE_PAGE_SIZE } from '@/lib/pagination/constants'
import type { OrderListRow, OrderStatus, UserRole } from '@/lib/orders/load-orders'
import {
  ORDER_STATUS_CHIP,
  ORDER_STATUS_LABEL,
  ORDER_STATUSES_ORDERED,
} from '@/lib/orders/order-status-labels'
import { cn } from '@/lib/utils'

function buildHref(
  pathname: string,
  params: { page?: number; q?: string; status?: string }
): string {
  const sp = new URLSearchParams()
  if (params.q) sp.set('q', params.q)
  if (params.status) sp.set('status', params.status)
  if (params.page && params.page > 1) sp.set('page', String(params.page))
  const qs = sp.toString()
  return qs ? `${pathname}?${qs}` : pathname
}

export function OrdersList({
  role,
  rows,
  totalCount,
  page,
  q,
  status,
}: {
  role: UserRole
  rows: OrderListRow[]
  totalCount: number
  page: number
  q: string
  status?: OrderStatus
}) {
  const pathname = usePathname()
  const router = useRouter()

  const showClientColumn = role === 'admin' || role === 'manager'

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const query = (fd.get('q') as string)?.trim() ?? ''
    router.push(buildHref(pathname, { q: query, status }))
  }

  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    router.push(buildHref(pathname, { q, status: e.target.value || undefined }))
  }

  return (
    <div className="space-y-layout mx-auto max-w-6xl">
      <div>
        <h2 className="text-foreground text-2xl font-semibold tracking-tight">Orders</h2>
        <p className="text-muted-foreground mt-inset text-sm leading-relaxed">
          Track order status through the full pipeline.
        </p>
      </div>

      <div className="gap-block flex flex-col sm:flex-row">
        <form onSubmit={handleSearch} className="gap-inset flex flex-1">
          <input
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Search by domain…"
            className="border-border bg-background text-foreground placeholder:text-muted-foreground h-9 flex-1 rounded-md border px-3 text-sm"
          />
          <button
            type="submit"
            className="border-border bg-background text-foreground h-9 rounded-md border px-4 text-sm font-medium"
          >
            Search
          </button>
        </form>
        <select
          value={status ?? ''}
          onChange={handleStatusChange}
          className="border-border bg-background text-foreground h-9 rounded-md border px-3 text-sm"
        >
          <option value="">All statuses</option>
          {ORDER_STATUSES_ORDERED.map((s) => (
            <option key={s} value={s}>
              {ORDER_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      {rows.length === 0 ? (
        <Card className="py-hero gap-block flex flex-col items-center text-center">
          <ClipboardList className="text-muted-foreground size-10" />
          <div className="space-y-inset">
            <p className="text-foreground font-semibold">No orders found</p>
            <p className="text-muted-foreground text-sm">
              {q || status ? 'Try adjusting your filters.' : 'Orders will appear here once placed.'}
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
                  {showClientColumn && (
                    <th className="text-muted-foreground px-section py-block text-left font-medium">
                      Client
                    </th>
                  )}
                  <th className="text-muted-foreground px-section py-block text-left font-medium">
                    Status
                  </th>
                  <th className="text-muted-foreground px-section py-block text-right font-medium">
                    Price
                  </th>
                  <th className="text-muted-foreground px-section py-block hidden text-left font-medium sm:table-cell">
                    Publish date
                  </th>
                  <th className="text-muted-foreground px-section py-block hidden text-left font-medium sm:table-cell">
                    Created
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
                        href={`/orders/${row.id}`}
                        className="text-foreground font-medium hover:underline"
                      >
                        {row.site_domain}
                      </Link>
                      <p className="text-muted-foreground text-xs">{row.site_category}</p>
                    </td>
                    {showClientColumn && (
                      <td className="text-muted-foreground px-section py-block text-sm">
                        {row.client_name ?? '—'}
                      </td>
                    )}
                    <td className="px-section py-block">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                          ORDER_STATUS_CHIP[row.status]
                        )}
                      >
                        {ORDER_STATUS_LABEL[row.status]}
                      </span>
                    </td>
                    <td className="text-foreground px-section py-block text-right font-semibold tabular-nums">
                      ${row.price.toFixed(2)}
                    </td>
                    <td className="text-muted-foreground px-section py-block hidden sm:table-cell">
                      {row.publish_date ?? '—'}
                    </td>
                    <td className="text-muted-foreground px-section py-block hidden sm:table-cell">
                      {new Date(row.created_at).toLocaleDateString()}
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
            buildHref={(p) => buildHref(pathname, { q, status, page: p })}
          />
        </Card>
      )}
    </div>
  )
}
