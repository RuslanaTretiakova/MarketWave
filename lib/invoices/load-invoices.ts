import { adminClient } from '@/lib/supabase/admin'
import { SETTINGS_TABLE_PAGE_SIZE } from '@/lib/pagination/constants'
import { sanitizeIlikePattern } from '@/lib/pagination/sanitize-ilike'
import type { Database } from '@/lib/supabase/types'
import type { SupabaseClient } from '@supabase/supabase-js'

export type InvoiceStatus = Database['public']['Enums']['invoice_status']

export type InvoiceListRow = {
  id: string
  // Kept for back-compat with components; may be null on new invoices.
  order_id: string | null
  billing_month: string
  invoice_number: string | null
  invoice_group_id: string | null
  status: InvoiceStatus
  /** Legacy single-amount field; equals total on new invoices. */
  amount: number
  subtotal: number
  adjustments: number
  total: number
  due_date: string | null
  paid_at: string | null
  sent_at: string | null
  created_at: string
  updated_at: string
  client_id: string
  client_name: string | null
  client_email: string | null
  /** For list display — no longer guaranteed to be a domain; may be '—'. */
  site_domain: string
  billing_period_label: string
  items_count: number
}

export type InvoicesSearchParams = {
  page: number
  client: string
  status?: InvoiceStatus
  billingPeriod?: string
  invoiceNumber?: string
  minAmount?: number
  maxAmount?: number
}

type InvoiceViewerRole = Database['public']['Enums']['user_role']

function isSchemaError(msg: string) {
  return (
    msg.includes('relationship') ||
    msg.includes('schema cache') ||
    msg.includes('does not exist') ||
    msg.includes('column') ||
    msg.includes('Could not find')
  )
}

export async function loadInvoicesPage(
  supabase: SupabaseClient<Database>,
  role: InvoiceViewerRole,
  params: InvoicesSearchParams
): Promise<{ rows: InvoiceListRow[]; totalCount: number }> {
  const pageSize = SETTINGS_TABLE_PAGE_SIZE
  let page = Math.max(1, Math.floor(params.page) || 1)
  const client = role === 'admin' || role === 'manager' ? adminClient : supabase

  // --- Attempt 1: new schema (post-migration) ---
  for (let attempt = 0; attempt < 2; attempt++) {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let q = client.from('invoices').select(
      `id, order_id, billing_month, invoice_number, invoice_group_id,
         status, amount, subtotal, adjustments, total,
         due_date, paid_at, sent_at, created_at, updated_at,
         client_id,
         client:profiles!client_id(full_name, email),
         items:invoice_items(id)`,
      { count: 'exact' }
    )

    if (params.status) q = q.eq('status', params.status)
    if (params.minAmount !== undefined) q = q.gte('total', params.minAmount)
    if (params.maxAmount !== undefined) q = q.lte('total', params.maxAmount)
    if (params.invoiceNumber) {
      q = q.ilike('invoice_number', `%${params.invoiceNumber.trim()}%`)
    }
    if (params.billingPeriod && /^\d{4}-\d{2}$/.test(params.billingPeriod)) {
      q = q.eq('billing_month', `${params.billingPeriod}-01`)
    }

    const { data, error, count } = await q.order('created_at', { ascending: false }).range(from, to)

    if (error) {
      if (isSchemaError(error.message ?? '')) {
        // Migration not yet applied — fall through to legacy query below.
        break
      }
      console.error('[invoices/load]', error.message)
      throw new Error(error.message || 'Failed to load invoices')
    }

    const totalCount = count ?? 0
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
    if (page > totalPages && attempt === 0) {
      page = totalPages
      continue
    }

    type RawRow = {
      id: string
      order_id: string | null
      billing_month: string
      invoice_number: string | null
      invoice_group_id: string | null
      status: InvoiceStatus
      amount: number
      subtotal: number
      adjustments: number
      total: number
      due_date: string | null
      paid_at: string | null
      sent_at: string | null
      created_at: string
      updated_at: string
      client_id: string
      client: { full_name: string | null; email: string | null } | null
      items: Array<{ id: string }> | null
    }

    const rawRows = (data ?? []) as unknown as RawRow[]
    let filtered = rawRows

    if (params.client && (role === 'admin' || role === 'manager')) {
      const needle = sanitizeIlikePattern(params.client).toLowerCase()
      if (needle.length > 0) {
        filtered = filtered.filter((r) => {
          const name = (r.client?.full_name ?? '').toLowerCase()
          const email = (r.client?.email ?? '').toLowerCase()
          return name.includes(needle) || email.includes(needle)
        })
      }
    }

    return {
      rows: filtered.map((r) => ({
        id: r.id,
        order_id: r.order_id,
        billing_month: r.billing_month,
        invoice_number: r.invoice_number,
        invoice_group_id: r.invoice_group_id,
        status: r.status,
        amount: r.amount,
        subtotal: r.subtotal,
        adjustments: r.adjustments,
        total: r.total,
        due_date: r.due_date,
        paid_at: r.paid_at,
        sent_at: r.sent_at,
        created_at: r.created_at,
        updated_at: r.updated_at,
        client_id: r.client_id,
        client_name: r.client?.full_name ?? null,
        client_email: r.client?.email ?? null,
        site_domain: '—',
        billing_period_label: (r.billing_month ?? '').slice(0, 7),
        items_count: r.items?.length ?? 0,
      })),
      totalCount:
        params.client && (role === 'admin' || role === 'manager') ? filtered.length : totalCount,
    }
  }

  // --- Fallback: legacy schema (pre-migration, order_id is the FK) ---
  for (let attempt = 0; attempt < 2; attempt++) {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let q = client.from('invoices').select(
      `id, order_id, billing_month, invoice_number, invoice_group_id,
         status, amount, due_date, paid_at, sent_at, created_at, updated_at,
         order:orders!order_id(site_domain, user_id, price,
           client:profiles!user_id(full_name, email))`,
      { count: 'exact' }
    )

    if (params.status) q = q.eq('status', params.status)
    if (params.minAmount !== undefined) q = q.gte('amount', params.minAmount)
    if (params.maxAmount !== undefined) q = q.lte('amount', params.maxAmount)
    if (params.invoiceNumber) {
      q = q.ilike('invoice_number', `%${params.invoiceNumber.trim()}%`)
    }
    if (params.billingPeriod && /^\d{4}-\d{2}$/.test(params.billingPeriod)) {
      q = q.eq('billing_month', `${params.billingPeriod}-01`)
    }

    const { data, error, count } = await q.order('created_at', { ascending: false }).range(from, to)

    if (error) {
      console.error('[invoices/load:legacy]', error.message)
      return { rows: [], totalCount: 0 }
    }

    const totalCount = count ?? 0
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
    if (page > totalPages && attempt === 0) {
      page = totalPages
      continue
    }

    type LegacyOrder = {
      site_domain: string | null
      user_id: string
      price: number
      client: { full_name: string | null; email: string | null } | null
    }
    type LegacyRow = {
      id: string
      order_id: string | null
      billing_month: string | null
      invoice_number: string | null
      invoice_group_id: string | null
      status: InvoiceStatus
      amount: number
      due_date: string | null
      paid_at: string | null
      sent_at: string | null
      created_at: string
      updated_at: string
      order: LegacyOrder | null
    }

    const rawRows = (data ?? []) as unknown as LegacyRow[]
    let filtered = rawRows

    if (params.client && (role === 'admin' || role === 'manager')) {
      const needle = sanitizeIlikePattern(params.client).toLowerCase()
      if (needle.length > 0) {
        filtered = filtered.filter((r) => {
          const name = (r.order?.client?.full_name ?? '').toLowerCase()
          const email = (r.order?.client?.email ?? '').toLowerCase()
          return name.includes(needle) || email.includes(needle)
        })
      }
    }

    return {
      rows: filtered.map((r) => ({
        id: r.id,
        order_id: r.order_id,
        billing_month: r.billing_month ?? r.created_at.slice(0, 10),
        invoice_number: r.invoice_number,
        invoice_group_id: r.invoice_group_id,
        status: r.status,
        amount: r.amount,
        subtotal: r.amount,
        adjustments: 0,
        total: r.amount,
        due_date: r.due_date,
        paid_at: r.paid_at,
        sent_at: r.sent_at,
        created_at: r.created_at,
        updated_at: r.updated_at,
        client_id: r.order?.user_id ?? '',
        client_name: r.order?.client?.full_name ?? null,
        client_email: r.order?.client?.email ?? null,
        site_domain: r.order?.site_domain ?? '—',
        billing_period_label: (r.billing_month ?? r.created_at).slice(0, 7),
        items_count: r.order_id ? 1 : 0,
      })),
      totalCount:
        params.client && (role === 'admin' || role === 'manager') ? filtered.length : totalCount,
    }
  }

  return { rows: [], totalCount: 0 }
}

export type InvoiceItem = {
  id: string
  order_id: string
  site_domain: string | null
  description: string | null
  amount: number
  order_status: Database['public']['Enums']['order_status'] | null
  order_published_url: string | null
  order_publish_date: string | null
  order_price: number
}

export type InvoiceDetail = Omit<InvoiceListRow, 'items_count'> & {
  notes: string | null
  generated_at: string | null
  sent_by: string | null
  paid_by: string | null
  sent_by_name: string | null
  paid_by_name: string | null
  items: InvoiceItem[]
  // Legacy: first item's order fields (for single-order invoices / PDF back-compat)
  order_status: Database['public']['Enums']['order_status']
  order_published_url: string | null
  order_publish_date: string | null
  order_price: number
}

export async function loadInvoiceDetail(
  supabase: SupabaseClient<Database>,
  role: InvoiceViewerRole,
  invoiceId: string
): Promise<InvoiceDetail | null> {
  const client = role === 'admin' || role === 'manager' ? adminClient : supabase

  const { data, error } = await client
    .from('invoices')
    .select(
      `id, order_id, billing_month, invoice_number, invoice_group_id,
       status, amount, subtotal, adjustments, total,
       due_date, paid_at, sent_at, notes, generated_at, sent_by, paid_by,
       created_at, updated_at, client_id,
       client:profiles!client_id(full_name, email),
       items:invoice_items(
         id, order_id, site_domain, description, amount,
         order:orders(status, published_url, publish_date, price)
       )`
    )
    .eq('id', invoiceId)
    .maybeSingle()

  if (error) {
    console.error('[invoices/detail]', error.message)
    return null
  }
  if (!data) return null

  type RawInvoice = {
    id: string
    order_id: string | null
    billing_month: string
    invoice_number: string | null
    invoice_group_id: string | null
    status: InvoiceStatus
    amount: number
    subtotal: number
    adjustments: number
    total: number
    due_date: string | null
    paid_at: string | null
    sent_at: string | null
    notes: string | null
    generated_at: string | null
    sent_by: string | null
    paid_by: string | null
    created_at: string
    updated_at: string
    client_id: string
    client: { full_name: string | null; email: string | null } | null
    items: Array<{
      id: string
      order_id: string
      site_domain: string | null
      description: string | null
      amount: number
      order: {
        status: Database['public']['Enums']['order_status']
        published_url: string | null
        publish_date: string | null
        price: number
      } | null
    }> | null
  }

  const row = data as unknown as RawInvoice

  // Resolve sent_by / paid_by names
  let sent_by_name: string | null = null
  let paid_by_name: string | null = null
  if (role === 'admin' || role === 'manager') {
    const actorIds = [...new Set([row.sent_by, row.paid_by].filter(Boolean))] as string[]
    if (actorIds.length > 0) {
      const { data: actors } = await adminClient
        .from('profiles')
        .select('id, full_name')
        .in('id', actorIds)
      const nameMap = new Map((actors ?? []).map((p) => [p.id, p.full_name]))
      sent_by_name = row.sent_by ? (nameMap.get(row.sent_by) ?? null) : null
      paid_by_name = row.paid_by ? (nameMap.get(row.paid_by) ?? null) : null
    }
  }

  const rawItems = row.items ?? []
  const items: InvoiceItem[] = rawItems.map((it) => ({
    id: it.id,
    order_id: it.order_id,
    site_domain: it.site_domain,
    description: it.description,
    amount: it.amount,
    order_status: it.order?.status ?? null,
    order_published_url: it.order?.published_url ?? null,
    order_publish_date: it.order?.publish_date ?? null,
    order_price: it.order?.price ?? it.amount,
  }))

  const firstItem = items[0]

  return {
    id: row.id,
    order_id: row.order_id,
    billing_month: row.billing_month,
    billing_period_label: row.billing_month.slice(0, 7),
    invoice_number: row.invoice_number,
    invoice_group_id: row.invoice_group_id,
    status: row.status,
    amount: row.amount,
    subtotal: row.subtotal,
    adjustments: row.adjustments,
    total: row.total,
    due_date: row.due_date,
    paid_at: row.paid_at,
    sent_at: row.sent_at,
    notes: row.notes,
    generated_at: row.generated_at,
    sent_by: row.sent_by,
    paid_by: row.paid_by,
    sent_by_name,
    paid_by_name,
    created_at: row.created_at,
    updated_at: row.updated_at,
    client_id: row.client_id,
    client_name: row.client?.full_name ?? null,
    client_email: row.client?.email ?? null,
    site_domain: firstItem?.site_domain ?? '—',
    items,
    order_status: firstItem?.order_status ?? 'published',
    order_published_url: firstItem?.order_published_url ?? null,
    order_publish_date: firstItem?.order_publish_date ?? null,
    order_price: firstItem?.order_price ?? row.amount,
  }
}
