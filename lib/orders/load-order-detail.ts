import type { SupabaseClient } from '@supabase/supabase-js'

import { adminClient } from '@/lib/supabase/admin'
import { loadOrderContent, type OrderContentBundle } from '@/lib/orders/load-order-content'
import type { Database } from '@/lib/supabase/types'

export type UserRole = Database['public']['Enums']['user_role']
export type OrderStatus = Database['public']['Enums']['order_status']
export type InvoiceStatus = Database['public']['Enums']['invoice_status']
export type ChangeRequestStatus = Database['public']['Enums']['change_request_status']

export type OrderInvoice = {
  id: string
  status: InvoiceStatus
  amount: number
  due_date: string | null
  paid_at: string | null
  created_at: string
}

export type OrderChangeRequest = {
  id: string
  comment: string
  status: ChangeRequestStatus
  user_id: string
  created_at: string
  updated_at: string
}

export type OrderDetail = {
  id: string
  user_id: string
  site_id: string | null
  copywriter_id: string | null
  status: OrderStatus
  price: number
  publish_date: string | null
  anchor_text: string | null
  target_url: string | null
  client_notes: string | null
  published_url: string | null
  created_at: string
  updated_at: string
  site_domain: string
  site_dr: number | null
  site_category: string
  site_countries: string[]
  site_languages: string[]
  site_link_type: Database['public']['Enums']['link_type']
  site_requirements: string | null
  site_description: string | null
  site_contact_info: string | null
  site_keywords_relevance: string | null
  site_organic_keywords_count: number | null
  site_organic_traffic_count: number | null
  invoice: OrderInvoice | null
  change_requests: OrderChangeRequest[]
  content: OrderContentBundle
  client_name: string | null
  client_email: string | null
  copywriter_name: string | null
}

export async function loadOrderDetail(
  supabase: SupabaseClient<Database>,
  orderId: string,
  role: UserRole
): Promise<OrderDetail | null> {
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .maybeSingle()

  if (orderErr || !order) return null

  // Load invoice — RLS handles visibility per role
  const { data: invoiceData } = await supabase
    .from('invoices')
    .select('id, status, amount, due_date, paid_at, created_at')
    .eq('order_id', orderId)
    .maybeSingle()

  // Load change requests
  const { data: changeRequestsData } = await supabase
    .from('change_requests')
    .select('id, comment, status, user_id, created_at, updated_at')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })

  // Load article content (RLS-scoped per role: drafts hidden from client)
  const content = await loadOrderContent(supabase, orderId)

  let client_name: string | null = null
  let client_email: string | null = null
  let copywriter_name: string | null = null

  // Resolve profile display names for staff (admin/manager need cross-user reads)
  if (role === 'admin' || role === 'manager') {
    const profileIds = [order.user_id, order.copywriter_id].filter(Boolean) as string[]
    if (profileIds.length > 0) {
      const { data: profiles } = await adminClient
        .from('profiles')
        .select('id, full_name, email')
        .in('id', profileIds)

      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]))
      const clientProfile = profileMap.get(order.user_id)
      client_name = clientProfile?.full_name ?? null
      client_email = clientProfile?.email ?? null

      if (order.copywriter_id) {
        copywriter_name = profileMap.get(order.copywriter_id)?.full_name ?? null
      }
    }
  }

  return {
    id: order.id,
    user_id: order.user_id,
    site_id: order.site_id,
    copywriter_id: order.copywriter_id,
    status: order.status,
    price: order.price,
    publish_date: order.publish_date,
    anchor_text: order.anchor_text,
    target_url: order.target_url,
    client_notes: order.client_notes,
    published_url: order.published_url,
    created_at: order.created_at,
    updated_at: order.updated_at,
    site_domain: order.site_domain,
    site_dr: order.site_dr,
    site_category: order.site_category,
    site_countries: order.site_countries,
    site_languages: order.site_languages,
    site_link_type: order.site_link_type,
    site_requirements: order.site_requirements,
    site_description: order.site_description,
    site_contact_info: order.site_contact_info,
    site_keywords_relevance: order.site_keywords_relevance,
    site_organic_keywords_count: order.site_organic_keywords_count,
    site_organic_traffic_count: order.site_organic_traffic_count,
    invoice: invoiceData ?? null,
    change_requests: (changeRequestsData ?? []) as OrderChangeRequest[],
    content,
    client_name,
    client_email,
    copywriter_name,
  }
}
