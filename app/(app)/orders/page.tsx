import { notFound } from 'next/navigation'

import { OrdersList } from '@/components/orders/orders-list'
import { searchParamFirstString } from '@/lib/pagination/search-param-first-string'
import { loadOrdersPage } from '@/lib/orders/load-orders'
import type { OrderStatus } from '@/lib/orders/load-orders'
import { ORDER_STATUSES_ORDERED } from '@/lib/orders/order-status-labels'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Orders',
}

type SearchParams = {
  page?: string | string[]
  q?: string | string[]
  status?: string | string[]
}

export default async function OrdersPage(props: { searchParams: Promise<SearchParams> }) {
  const sp = await props.searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) notFound()

  const pageRaw = searchParamFirstString(sp.page)
  const qRaw = searchParamFirstString(sp.q)
  const statusRaw = searchParamFirstString(sp.status)

  const page = Math.max(1, Math.floor(Number(pageRaw)) || 1)
  const q = qRaw?.trim() ?? ''
  const status = ORDER_STATUSES_ORDERED.includes(statusRaw as OrderStatus)
    ? (statusRaw as OrderStatus)
    : undefined

  const { rows, totalCount } = await loadOrdersPage(supabase, profile.role, { page, q, status })

  return (
    <OrdersList
      role={profile.role}
      rows={rows}
      totalCount={totalCount}
      page={page}
      q={q}
      status={status}
    />
  )
}
