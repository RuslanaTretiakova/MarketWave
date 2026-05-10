'use client'
import { ClipboardList } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { OrderActionsMenu } from '@/components/orders/order-actions-menu'
import { SettingsTablePagination } from '@/components/settings/settings-table-pagination'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FilterInput, FilterSelect } from '@/components/ui/filter-bar'
import { PageHeader } from '@/components/ui/page-header'
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
  params: { page?: number; q?: string; status?: string; copywriter?: string }
): string {
  const sp = new URLSearchParams()
  if (params.q) sp.set('q', params.q)
  if (params.status) sp.set('status', params.status)
  if (params.copywriter) sp.set('copywriter', params.copywriter)
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
  copywriterOptions,
}: {
  role: UserRole
  userId: string
  rows: OrderListRow[]
  totalCount: number
  page: number
  q: string
  status?: OrderStatus
  copywriterId?: string
  copywriterOptions?: CopywriterOption[]
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
        buildHref(pathname, { q: next || undefined, status, copywriter: copywriterId }),
        { scroll: false }
      )
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(id)
  }, [searchDraft, q, pathname, router, status, copywriterId])

  function clearSearch() {
    setSearchDraft('')
    router.replace(buildHref(pathname, { status, copywriter: copywriterId }), { scroll: false })
  }

  const showClientColumn = role === 'admin' || role === 'manager'
  const showCopywriterFilter =
    (role === 'admin' || role === 'manager') && (copywriterOptions?.length ?? 0) > 0

  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    router.push(
      buildHref(pathname, { q, status: e.target.value || undefined, copywriter: copywriterId })
    )
  }

  function handleCopywriterChange(e: React.ChangeEvent<HTMLSelectElement>) {
    router.push(buildHref(pathname, { q, status, copywriter: e.target.value || undefined }))
  }

  return (
    <div className="space-y-layout mx-auto max-w-6xl">
      <PageHeader title="Orders" description="Track order status through the full pipeline." />

      <div className="gap-block flex flex-col sm:flex-row sm:flex-wrap">
        <form onSubmit={(e) => e.preventDefault()} className="gap-inset flex min-w-[220px] flex-1">
          <FilterInput
            name="q"
            type="search"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Search by domain…"
            className="flex-1"
            autoComplete="off"
          />
          {searchDraft ? (
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
        </form>
        <FilterSelect value={status ?? ''} onChange={handleStatusChange}>
          <option value="">All statuses</option>
          {ORDER_STATUSES_ORDERED.map((s) => (
            <option key={s} value={s}>
              {ORDER_STATUS_LABEL[s]}
            </option>
          ))}
        </FilterSelect>
        {showCopywriterFilter && (
          <FilterSelect value={copywriterId ?? ''} onChange={handleCopywriterChange}>
            <option value="">All copywriters</option>
            {(copywriterOptions ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name ?? c.email ?? c.id.slice(0, 8)}
              </option>
            ))}
          </FilterSelect>
        )}
      </div>

      {rows.length === 0 ? (
        <Card className="py-hero gap-block flex flex-col items-center text-center">
          <ClipboardList className="text-muted-foreground size-10" />
          <div className="space-y-inset">
            <p className="text-foreground font-semibold">No orders found</p>
            <p className="text-muted-foreground text-sm">
              {q || status || copywriterId
                ? 'Try adjusting your filters.'
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
                    <td className="px-section py-block">
                      <p className="text-foreground font-medium">{row.site_domain}</p>
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
                    <td className="px-section py-block text-right">
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
            buildHref={(p) => buildHref(pathname, { q, status, copywriter: copywriterId, page: p })}
          />
        </Card>
      )}
    </div>
  )
}
