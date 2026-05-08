import { adminClient } from '@/lib/supabase/admin'
import { SETTINGS_TABLE_PAGE_SIZE } from '@/lib/pagination/constants'
import { sanitizeIlikePattern } from '@/lib/pagination/sanitize-ilike'
import { quotePostgrestFilterValue } from '@/lib/supabase/postgrest-quote-filter-value'
import type { Database } from '@/lib/supabase/types'
import type { SupabaseClient } from '@supabase/supabase-js'

export type InvoiceStatus = Database['public']['Enums']['invoice_status']

export type InvoiceListRow = {
  id: string
  order_id: string
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
}

export type InvoicesSearchParams = {
  page: number
  q: string
  status?: InvoiceStatus
  /** Filter on `due_date >= dueFrom` (ISO date YYYY-MM-DD) */
  dueFrom?: string
  /** Filter on `due_date <= dueTo` */
  dueTo?: string
}

type InvoiceViewerRole = Database['public']['Enums']['user_role']

function isMissingSentAtColumn(message: string): boolean {
  return message.includes('column invoices.sent_at does not exist')
}

function normalizeSentAt<T extends { sent_at?: string | null }>(
  row: T
): T & { sent_at: string | null } {
  return { ...row, sent_at: row.sent_at ?? null }
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

  const dueFrom = params.dueFrom?.trim()
  const dueTo = params.dueTo?.trim()
  const validDate = (d?: string) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : undefined)

  let rows: InvoiceListRow[] = []
  let totalCount = 0

  for (let attempt = 0; attempt < 2; attempt++) {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const client = role === 'admin' || role === 'manager' ? adminClient : supabase
    let q = client.from('invoices').select(
      `
        id, order_id, status, amount, due_date, paid_at, sent_at, created_at, updated_at,
        order:orders!inner(site_domain, user_id)
      `,
      { count: 'exact' }
    )

    if (params.status) q = q.eq('status', params.status)
    const safeDueFrom = validDate(dueFrom)
    const safeDueTo = validDate(dueTo)
    if (safeDueFrom) q = q.gte('due_date', safeDueFrom)
    if (safeDueTo) q = q.lte('due_date', safeDueTo)

    const safeQ = sanitizeIlikePattern(params.q)
    if (safeQ.length > 0) {
      const pat = `%${safeQ}%`
      const quoted = quotePostgrestFilterValue(pat)
      q = q.ilike('order.site_domain', quoted)
    }

    let { data, error, count } = await q.order('created_at', { ascending: false }).range(from, to)

    // Compatibility fallback while local/remote DB still misses `invoices.sent_at`.
    if (error && isMissingSentAtColumn(error.message ?? '')) {
      const fallback = await client
        .from('invoices')
        .select(
          `
          id, order_id, status, amount, due_date, paid_at, created_at, updated_at,
          order:orders!inner(site_domain, user_id)
        `,
          { count: 'exact' }
        )
        .order('created_at', { ascending: false })
        .range(from, to)

      data = (fallback.data ?? []).map((r) => normalizeSentAt(r))
      error = fallback.error
      count = fallback.count
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
      return {
        id: r.id,
        order_id: r.order_id,
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
}

export async function loadInvoiceDetail(
  supabase: SupabaseClient<Database>,
  role: InvoiceViewerRole,
  invoiceId: string
): Promise<InvoiceDetail | null> {
  const client = role === 'admin' || role === 'manager' ? adminClient : supabase
  let { data, error } = await client
    .from('invoices')
    .select(
      `
      id, order_id, status, amount, due_date, paid_at, sent_at, created_at, updated_at,
      order:orders!inner(
        site_domain, user_id, status, published_url, publish_date, price
      )
    `
    )
    .eq('id', invoiceId)
    .maybeSingle()

  if (error && isMissingSentAtColumn(error.message ?? '')) {
    const fallback = await client
      .from('invoices')
      .select(
        `
        id, order_id, status, amount, due_date, paid_at, created_at, updated_at,
        order:orders!inner(
          site_domain, user_id, status, published_url, publish_date, price
        )
      `
      )
      .eq('id', invoiceId)
      .maybeSingle()

    data = fallback.data ? normalizeSentAt(fallback.data) : fallback.data
    error = fallback.error
  }

  if (error) {
    console.error('[invoices/detail]', error.message)
    return null
  }
  if (!data) return null

  type Joined = {
    id: string
    order_id: string
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

  return {
    id: row.id,
    order_id: row.order_id,
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
    order_status: row.order?.status ?? 'new',
    order_published_url: row.order?.published_url ?? null,
    order_publish_date: row.order?.publish_date ?? null,
    order_price: row.order?.price ?? row.amount,
  }
}
