import { adminClient } from '@/lib/supabase/admin'
import { SETTINGS_TABLE_PAGE_SIZE } from '@/lib/pagination/constants'
import { sanitizeIlikePattern } from '@/lib/pagination/sanitize-ilike'
import type { Database } from '@/lib/supabase/types'
import type { SupabaseClient } from '@supabase/supabase-js'

export type InvoiceStatus = Database['public']['Enums']['invoice_status']

export type InvoiceListRow = {
  id: string
  order_id: string
  billing_month: string | null
  invoice_group_id: string | null
  invoice_number: string | null
  status: InvoiceStatus
  amount: number
  due_date: string | null
  paid_at: string | null
  sent_at: string | null
  created_at: string
  updated_at: string
  client_id: string
  client_name: string | null
  client_email: string | null
  site_domain: string
  billing_period_label: string
}

export type InvoicesSearchParams = {
  page: number
  client: string
  status?: InvoiceStatus
  billingPeriod?: string
  minAmount?: number
  maxAmount?: number
  invoiceNumber?: string
}

type InvoiceViewerRole = Database['public']['Enums']['user_role']

function isMissingSentAtColumn(message: string): boolean {
  return message.includes('column invoices.sent_at does not exist')
}

function isMissingBillingMonthColumn(message: string): boolean {
  return message.includes('column invoices.billing_month does not exist')
}

function isMissingInvoiceNumberColumn(message: string): boolean {
  return message.includes('column invoices.invoice_number does not exist')
}

function isMissingInvoiceItemsRelation(message: string): boolean {
  return (
    message.includes("Could not find a relationship between 'invoices' and 'invoice_items'") ||
    message.includes('invoice_items')
  )
}

function isMissingInvoiceItemsTable(message: string): boolean {
  return (
    message.includes('relation "public.invoice_items" does not exist') ||
    message.includes("Could not find the table 'public.invoice_items' in the schema cache")
  )
}

function quotePostgrestFilterValue(value: string): string {
  return '"' + value.replace(/"/g, '\\"') + '"'
}

function normalizeSentAt<T extends { sent_at?: string | null }>(
  row: T
): T & { sent_at: string | null } {
  return { ...row, sent_at: row.sent_at ?? null }
}

function normalizeBillingMonth<T extends { billing_month?: string | null }>(
  row: T
): T & { billing_month: string | null } {
  return { ...row, billing_month: row.billing_month ?? null }
}

function normalizeInvoiceNumber<T extends { invoice_number?: string | null }>(
  row: T
): T & { invoice_number: string | null } {
  return { ...row, invoice_number: row.invoice_number ?? null }
}

function invoicesListSelect(opts: {
  billingMonth: boolean
  sentAt: boolean
  invoiceNumber: boolean
}): string {
  const cols = [
    'id',
    'order_id',
    ...(opts.billingMonth ? ['billing_month'] : []),
    'invoice_group_id',
    ...(opts.invoiceNumber ? ['invoice_number'] : []),
    'status',
    'amount',
    'due_date',
    'paid_at',
    ...(opts.sentAt ? ['sent_at'] : []),
    'created_at',
    'updated_at',
  ]
  return `
        ${cols.join(', ')},
        order:orders!inner(site_domain, user_id)
      `
}

function invoiceDetailSelect(opts: {
  billingMonth: boolean
  sentAt: boolean
  invoiceNumber: boolean
}): string {
  const cols = [
    'id',
    'order_id',
    ...(opts.billingMonth ? ['billing_month'] : []),
    'invoice_group_id',
    ...(opts.invoiceNumber ? ['invoice_number'] : []),
    'status',
    'amount',
    'due_date',
    'paid_at',
    ...(opts.sentAt ? ['sent_at'] : []),
    'created_at',
    'updated_at',
  ]
  return `
      ${cols.join(', ')},
      order:orders!inner(
        site_domain, user_id, status, published_url, publish_date, price
      )
    `
}

/**
 * Loads invoices joined with their order's site domain + client. Uses the service-role
 * client because page-gated admin/manager pages already pre-flight role auth.
 */
export async function loadInvoicesPage(
  supabase: SupabaseClient<Database>,
  role: InvoiceViewerRole,
  params: InvoicesSearchParams
): Promise<{ rows: InvoiceListRow[]; totalCount: number }> {
  const pageSize = SETTINGS_TABLE_PAGE_SIZE
  let page = Math.max(1, Math.floor(params.page) || 1)

  let rows: InvoiceListRow[] = []
  let totalCount = 0

  // Resolve client name/email filter to a concrete list of order IDs before the main query.
  // This keeps pagination count accurate (the in-memory approach set totalCount = rows.length
  // for only the current page, silently breaking multi-page navigation).
  let clientOrderIds: string[] | null = null
  const safeClient = sanitizeIlikePattern(params.client)
  if (safeClient.length > 0 && (role === 'admin' || role === 'manager')) {
    const pat = `%${safeClient}%`
    const quoted = quotePostgrestFilterValue(pat)
    const { data: matchingProfiles } = await adminClient
      .from('profiles')
      .select('id')
      .or(`full_name.ilike.${quoted},email.ilike.${quoted}`)
    const userIds = (matchingProfiles ?? []).map((p) => p.id)
    if (userIds.length === 0) return { rows: [], totalCount: 0 }
    const { data: matchingOrders } = await adminClient
      .from('orders')
      .select('id')
      .in('user_id', userIds)
    const orderIds = (matchingOrders ?? []).map((o) => o.id)
    if (orderIds.length === 0) return { rows: [], totalCount: 0 }
    clientOrderIds = orderIds
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const client = role === 'admin' || role === 'manager' ? adminClient : supabase

    let billingMonth = true
    let sentAt = true
    let invoiceNumber = true
    let data: unknown = null
    let error: { message: string } | null = null
    let count: number | null = null

    for (;;) {
      let q = client
        .from('invoices')
        .select(invoicesListSelect({ billingMonth, sentAt, invoiceNumber }), {
          count: 'exact',
        })

      if (clientOrderIds !== null) q = q.in('order_id', clientOrderIds)
      if (params.status) q = q.eq('status', params.status)
      if (params.minAmount !== undefined) q = q.gte('amount', params.minAmount)
      if (params.maxAmount !== undefined) q = q.lte('amount', params.maxAmount)
      if (params.invoiceNumber && invoiceNumber)
        q = q.ilike('invoice_number', `%${params.invoiceNumber.trim()}%`)
      if (params.billingPeriod && /^\d{4}-\d{2}$/.test(params.billingPeriod)) {
        const monthStart = `${params.billingPeriod}-01`
        const [yearPart, monthPart] = params.billingPeriod.split('-')
        const year = Number(yearPart)
        const month = Number(monthPart)
        const nextMonthDate = new Date(Date.UTC(year, month, 1))
        const nextMonthStart = nextMonthDate.toISOString().slice(0, 10)

        if (billingMonth) {
          q = q.or(
            `billing_month.eq.${monthStart},and(billing_month.is.null,created_at.gte.${monthStart},created_at.lt.${nextMonthStart})`
          )
        } else {
          q = q.gte('created_at', monthStart).lt('created_at', nextMonthStart)
        }
      }

      const res = await q.order('created_at', { ascending: false }).range(from, to)
      data = res.data
      error = res.error
      count = res.count

      if (!error) break

      const msg = error.message ?? ''
      if (billingMonth && isMissingBillingMonthColumn(msg)) {
        billingMonth = false
        continue
      }
      if (sentAt && isMissingSentAtColumn(msg)) {
        sentAt = false
        continue
      }
      if (invoiceNumber && isMissingInvoiceNumberColumn(msg)) {
        invoiceNumber = false
        continue
      }
      break
    }

    if (data && Array.isArray(data)) {
      data = (data as unknown[]).map((r) =>
        normalizeInvoiceNumber(
          normalizeBillingMonth(
            normalizeSentAt(
              r as {
                sent_at?: string | null
                billing_month?: string | null
                invoice_number?: string | null
              }
            )
          )
        )
      ) as typeof data
    }

    if (error) {
      console.error('[invoices/load]', error.message)
      throw new Error(error.message || 'Failed to load invoices')
    }

    totalCount = count ?? 0
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
    if (page > totalPages) {
      page = totalPages
      continue
    }

    type InvRow = {
      id: string
      order_id: string
      billing_month: string | null
      invoice_group_id: string | null
      invoice_number: string | null
      status: InvoiceStatus
      amount: number
      due_date: string | null
      paid_at: string | null
      sent_at: string | null
      created_at: string
      updated_at: string
      order: { site_domain: string; user_id: string } | null
    }

    const rawRows = (data ?? []) as unknown as InvRow[]

    const profileMap = new Map<string, { full_name: string | null; email: string | null }>()
    if (role === 'admin' || role === 'manager') {
      const userIds = [...new Set(rawRows.map((r) => r.order?.user_id).filter(Boolean))] as string[]
      if (userIds.length > 0) {
        const { data: profiles } = await adminClient
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds)
        ;(profiles ?? []).forEach((p) => {
          profileMap.set(p.id, { full_name: p.full_name, email: p.email })
        })
      }
    }

    rows = rawRows.map((r) => {
      const clientId = r.order?.user_id ?? ''
      const profile = profileMap.get(clientId)
      const billingPeriodLabel = r.billing_month
        ? r.billing_month.slice(0, 7)
        : r.created_at.slice(0, 7)
      return {
        id: r.id,
        order_id: r.order_id,
        billing_month: r.billing_month,
        invoice_group_id: r.invoice_group_id,
        invoice_number: r.invoice_number,
        status: r.status,
        amount: r.amount,
        due_date: r.due_date,
        paid_at: r.paid_at,
        sent_at: r.sent_at,
        created_at: r.created_at,
        updated_at: r.updated_at,
        client_id: clientId,
        client_name: profile?.full_name ?? null,
        client_email: profile?.email ?? null,
        site_domain: r.order?.site_domain ?? '—',
        billing_period_label: billingPeriodLabel,
      }
    })

    break
  }

  return { rows, totalCount }
}

export type InvoiceDetail = InvoiceListRow & {
  order_status: Database['public']['Enums']['order_status']
  order_published_url: string | null
  order_publish_date: string | null
  order_price: number
  items: Array<{
    id: string
    order_id: string
    site_domain: string
    amount: number
  }>
}

export async function loadInvoiceDetail(
  supabase: SupabaseClient<Database>,
  role: InvoiceViewerRole,
  invoiceId: string
): Promise<InvoiceDetail | null> {
  const client = role === 'admin' || role === 'manager' ? adminClient : supabase

  let billingMonth = true
  let sentAt = true
  let invoiceNumber = true
  let includeItemsJoin = true
  let data: unknown = null
  let error: { message: string } | null = null

  for (;;) {
    const select = includeItemsJoin
      ? `${invoiceDetailSelect({ billingMonth, sentAt, invoiceNumber })},
        items:invoice_items(id, order_id, site_domain, amount)`
      : invoiceDetailSelect({ billingMonth, sentAt, invoiceNumber })

    const res = await client.from('invoices').select(select).eq('id', invoiceId).maybeSingle()
    data = res.data
    error = res.error

    if (!error) break

    const msg = error.message ?? ''
    if (billingMonth && isMissingBillingMonthColumn(msg)) {
      billingMonth = false
      continue
    }
    if (sentAt && isMissingSentAtColumn(msg)) {
      sentAt = false
      continue
    }
    if (invoiceNumber && isMissingInvoiceNumberColumn(msg)) {
      invoiceNumber = false
      continue
    }
    if (includeItemsJoin && isMissingInvoiceItemsRelation(msg)) {
      includeItemsJoin = false
      continue
    }
    break
  }

  if (data && typeof data === 'object') {
    data = normalizeInvoiceNumber(
      normalizeBillingMonth(
        normalizeSentAt(
          data as {
            sent_at?: string | null
            billing_month?: string | null
            invoice_number?: string | null
          }
        )
      )
    ) as typeof data
  }

  if (error) {
    console.error('[invoices/detail]', error.message)
    return null
  }
  if (!data) return null

  type Joined = {
    id: string
    order_id: string
    billing_month: string | null
    invoice_group_id: string | null
    invoice_number: string | null
    status: InvoiceStatus
    amount: number
    due_date: string | null
    paid_at: string | null
    sent_at: string | null
    created_at: string
    updated_at: string
    order: {
      site_domain: string
      user_id: string
      status: Database['public']['Enums']['order_status']
      published_url: string | null
      publish_date: string | null
      price: number
    } | null
    items?: Array<{
      id: string
      order_id: string
      site_domain: string
      amount: number
    }> | null
  }

  const row = data as unknown as Joined
  const clientId = row.order?.user_id ?? ''
  let client_name: string | null = null
  let client_email: string | null = null
  if (clientId && (role === 'admin' || role === 'manager')) {
    const { data: profile } = await adminClient
      .from('profiles')
      .select('full_name, email')
      .eq('id', clientId)
      .maybeSingle()
    client_name = profile?.full_name ?? null
    client_email = profile?.email ?? null
  }

  let items =
    (row.items ?? []).map((item) => ({
      id: item.id,
      order_id: item.order_id,
      site_domain: item.site_domain,
      amount: item.amount,
    })) ?? []

  if (!includeItemsJoin) {
    const itemsRes = await client
      .from('invoice_items')
      .select('id, order_id, site_domain, amount')
      .eq('invoice_id', invoiceId)
      .order('created_at', { ascending: true })
    if (itemsRes.error) {
      const message = itemsRes.error.message ?? ''
      if (!isMissingInvoiceItemsTable(message)) {
        console.error('[invoices/detail/items]', message)
        return null
      }
      items = []
    } else {
      items = (itemsRes.data ?? []).map((item) => ({
        id: item.id,
        order_id: item.order_id,
        site_domain: item.site_domain,
        amount: item.amount,
      }))
    }
  }

  if (items.length === 0) {
    items = [
      {
        id: `fallback:${row.id}`,
        order_id: row.order_id,
        site_domain: row.order?.site_domain ?? '—',
        amount: row.amount,
      },
    ]
  }

  return {
    id: row.id,
    order_id: row.order_id,
    billing_month: row.billing_month,
    invoice_group_id: row.invoice_group_id,
    invoice_number: row.invoice_number,
    status: row.status,
    amount: row.amount,
    due_date: row.due_date,
    paid_at: row.paid_at,
    sent_at: row.sent_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    client_id: clientId,
    client_name,
    client_email,
    site_domain: row.order?.site_domain ?? '—',
    billing_period_label: row.billing_month
      ? row.billing_month.slice(0, 7)
      : row.created_at.slice(0, 7),
    order_status: row.order?.status ?? 'new',
    order_published_url: row.order?.published_url ?? null,
    order_publish_date: row.order?.publish_date ?? null,
    order_price: row.order?.price ?? row.amount,
    items,
  }
}
