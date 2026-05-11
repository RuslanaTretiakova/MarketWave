import { notFound } from 'next/navigation'

import { OrdersList } from '@/components/orders/orders-list'
import { INVOICE_STATUSES_ORDERED } from '@/lib/invoices/invoice-status-labels'
import { loadClientOptions } from '@/lib/orders/load-client-options'
import { loadCopywriterOptions } from '@/lib/orders/load-copywriter-options'
import { searchParamFirstString } from '@/lib/pagination/search-param-first-string'
import { loadOrdersPage } from '@/lib/orders/load-orders'
import type { OrderStatus } from '@/lib/orders/load-orders'
import { ORDER_STATUSES_ORDERED } from '@/lib/orders/order-status-labels'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'All orders',
}

type SearchParams = {
  page?: string | string[]
  q?: string | string[]
  status?: string | string[]
  copywriter?: string | string[]
  client?: string | string[]
  publishDate?: string | string[]
  invoiceStatus?: string | string[]
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
  const copywriterRaw = searchParamFirstString(sp.copywriter)
  const clientRaw = searchParamFirstString(sp.client)
  const publishDateRaw = searchParamFirstString(sp.publishDate)
  const invoiceStatusRaw = searchParamFirstString(sp.invoiceStatus)

  const page = Math.max(1, Math.floor(Number(pageRaw)) || 1)
  const q = qRaw?.trim() ?? ''
  const status = ORDER_STATUSES_ORDERED.includes(statusRaw as OrderStatus)
    ? (statusRaw as OrderStatus)
    : undefined

  const isStaff = profile.role === 'admin' || profile.role === 'manager'
  // UUID v4 sanity check; falsy strings are ignored
  const validUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
  const copywriterId =
    isStaff && copywriterRaw && validUuid.test(copywriterRaw) ? copywriterRaw : undefined
  const clientId = isStaff && clientRaw && validUuid.test(clientRaw) ? clientRaw : undefined
  const publishDate =
    publishDateRaw && /^\d{4}-\d{2}-\d{2}$/.test(publishDateRaw) ? publishDateRaw : undefined
  const invoiceStatus = INVOICE_STATUSES_ORDERED.includes(
    invoiceStatusRaw as (typeof INVOICE_STATUSES_ORDERED)[number]
  )
    ? (invoiceStatusRaw as (typeof INVOICE_STATUSES_ORDERED)[number])
    : undefined

  const [{ rows, totalCount }, copywriterOptions, clientOptions] = await Promise.all([
    loadOrdersPage(supabase, profile.role, {
      page,
      q,
      status,
      copywriterId,
      clientId,
      publishDate,
      invoiceStatus,
    }),
    isStaff ? loadCopywriterOptions() : Promise.resolve(undefined),
    isStaff ? loadClientOptions() : Promise.resolve(undefined),
  ])

  return (
    <OrdersList
      role={profile.role}
      userId={user.id}
      rows={rows}
      totalCount={totalCount}
      page={page}
      q={q}
      status={status}
      copywriterId={copywriterId}
      clientId={clientId}
      publishDate={publishDate}
      invoiceStatus={invoiceStatus}
      copywriterOptions={copywriterOptions}
      clientOptions={clientOptions}
    />
  )
}
