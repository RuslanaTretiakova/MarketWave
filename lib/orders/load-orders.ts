import type { SupabaseClient } from '@supabase/supabase-js'

import { adminClient } from '@/lib/supabase/admin'
import { SETTINGS_TABLE_PAGE_SIZE } from '@/lib/pagination/constants'
import { sanitizeIlikePattern } from '@/lib/pagination/sanitize-ilike'
import { quotePostgrestFilterValue } from '@/lib/supabase/postgrest-quote-filter-value'
import type { Database } from '@/lib/supabase/types'

export type OrderStatus = Database['public']['Enums']['order_status']
export type UserRole = Database['public']['Enums']['user_role']

export type OrderListRow = {
  id: string
  status: OrderStatus
  site_domain: string
  site_category: string
  site_dr: number | null
  price: number
  publish_date: string | null
  created_at: string
  user_id: string
  copywriter_id: string | null
  client_name: string | null
  copywriter_name: string | null
  invoice_status: Database['public']['Enums']['invoice_status'] | null
}

export type OrdersSearchParams = {
  page: number
  q: string
  status?: OrderStatus
  copywriterId?: string
  clientId?: string
  publishDate?: string
  invoiceStatus?: Database['public']['Enums']['invoice_status']
}

export async function loadOrdersPage(
  supabase: SupabaseClient<Database>,
  role: UserRole,
  params: OrdersSearchParams
): Promise<{ rows: OrderListRow[]; totalCount: number }> {
  const pageSize = SETTINGS_TABLE_PAGE_SIZE
  let page = Math.max(1, Math.floor(params.page) || 1)
  let rows: OrderListRow[] = []
  let totalCount = 0

  for (let attempt = 0; attempt < 2; attempt++) {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let q = supabase
      .from('orders')
      .select(
        'id, status, site_domain, site_category, site_dr, price, publish_date, created_at, user_id, copywriter_id',
        {
          count: 'exact',
        }
      )

    const safeQ = sanitizeIlikePattern(params.q)
    if (safeQ.length > 0) {
      const pat = `%${safeQ}%`
      const quoted = quotePostgrestFilterValue(pat)
      const validUuid =
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
      if (validUuid.test(params.q.trim())) {
        q = q.or(`site_domain.ilike.${quoted},id.eq.${params.q.trim()}`)
      } else {
        q = q.ilike('site_domain', quoted)
      }
    }

    if (params.status) {
      q = q.eq('status', params.status)
    }

    if (params.copywriterId) {
      q = q.eq('copywriter_id', params.copywriterId)
    }
    if (params.clientId) {
      q = q.eq('user_id', params.clientId)
    }
    if (params.publishDate && /^\d{4}-\d{2}-\d{2}$/.test(params.publishDate)) {
      q = q.eq('publish_date', params.publishDate)
    }

    if (params.invoiceStatus) {
      const { data: invoiceRows, error: invoiceErr } = await adminClient
        .from('invoices')
        .select('order_id')
        .eq('status', params.invoiceStatus)
      if (invoiceErr) {
        console.error('[orders/load/invoice-filter]', invoiceErr.message)
        throw new Error(invoiceErr.message || 'Failed to filter by invoice status')
      }
      const orderIds = [...new Set((invoiceRows ?? []).map((row) => row.order_id))]
      if (orderIds.length === 0) {
        return { rows: [], totalCount: 0 }
      }
      q = q.in('id', orderIds)
    }

    const { data, error, count } = await q.order('created_at', { ascending: false }).range(from, to)

    if (error) {
      console.error('[orders/load]', error.message)
      throw new Error(error.message || 'Failed to load orders')
    }

    totalCount = count ?? 0
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
    if (page > totalPages) {
      page = totalPages
      continue
    }

    const rawRows = data ?? []

    // For staff roles, batch-resolve display names via service role
    const clientNames: Record<string, string | null> = {}
    const copywriterNames: Record<string, string | null> = {}

    if (role === 'admin' || role === 'manager') {
      const userIds = [...new Set(rawRows.map((r) => r.user_id).filter(Boolean))]
      const cwIds = [...new Set(rawRows.map((r) => r.copywriter_id).filter(Boolean))] as string[]

      if (userIds.length > 0) {
        const { data: profiles } = await adminClient
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds)
        ;(profiles ?? []).forEach((p) => {
          clientNames[p.id] = p.full_name
        })
      }

      if (cwIds.length > 0) {
        const { data: cwProfiles } = await adminClient
          .from('profiles')
          .select('id, full_name')
          .in('id', cwIds)
        ;(cwProfiles ?? []).forEach((p) => {
          copywriterNames[p.id] = p.full_name
        })
      }
    }

    const orderIds = rawRows.map((row) => row.id)
    const invoiceStatusByOrderId = new Map<string, Database['public']['Enums']['invoice_status']>()
    if (orderIds.length > 0) {
      const { data: invoiceRows } = await adminClient
        .from('invoices')
        .select('order_id, status, created_at')
        .in('order_id', orderIds)
        .order('created_at', { ascending: false })
      for (const invoice of invoiceRows ?? []) {
        if (!invoiceStatusByOrderId.has(invoice.order_id)) {
          invoiceStatusByOrderId.set(invoice.order_id, invoice.status)
        }
      }
    }

    rows = rawRows.map((r) => ({
      id: r.id,
      status: r.status,
      site_domain: r.site_domain,
      site_category: r.site_category,
      site_dr: r.site_dr,
      price: r.price,
      publish_date: r.publish_date,
      created_at: r.created_at,
      user_id: r.user_id,
      copywriter_id: r.copywriter_id,
      client_name: clientNames[r.user_id] ?? null,
      copywriter_name: r.copywriter_id ? (copywriterNames[r.copywriter_id] ?? null) : null,
      invoice_status: invoiceStatusByOrderId.get(r.id) ?? null,
    }))

    break
  }

  return { rows, totalCount }
}
