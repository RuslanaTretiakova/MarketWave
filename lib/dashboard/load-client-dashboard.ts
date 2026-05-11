import type { SupabaseClient } from '@supabase/supabase-js'

import type { OrderStatus } from '@/lib/orders/order-status-labels'
import type { Database } from '@/lib/supabase/types'

export type ClientOrderRow = {
  id: string
  site_domain: string
  status: OrderStatus
  price: number
  created_at: string
}

export type ClientInvoiceRow = {
  id: string
  order_id: string
  amount: number
  due_date: string | null
  status: 'pending' | 'overdue'
  site_domain: string
  age_days: number | null
}

export type ClientPipelineStage = { key: string; label: string; count: number }

const ORDER_PIPELINE: { status: OrderStatus; label: string }[] = [
  { status: 'new', label: 'New' },
  { status: 'in_progress', label: 'In progress' },
  { status: 'content_sent', label: 'Awaiting you' },
  { status: 'needs_changes', label: 'Needs changes' },
  { status: 'content_approved', label: 'Approved' },
  { status: 'published', label: 'Published' },
]

const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  'new',
  'in_progress',
  'content_sent',
  'needs_changes',
  'content_approved',
  'published',
]

export type ClientDashboardData = {
  ordersInFlight: number
  pendingApprovals: number
  ordersCompleted: number
  openInvoiceTotal: number
  openInvoiceCount: number
  cartItemCount: number
  pipeline: ClientPipelineStage[]
  pipelineMax: number
  /** Orders awaiting the client's review (status = content_sent). */
  awaitingApproval: ClientOrderRow[]
  /** Most recent active orders, oldest-first then newest cap (5). */
  recentOrders: ClientOrderRow[]
  /** Top open invoices for the side card. */
  openInvoices: ClientInvoiceRow[]
}

export async function loadClientDashboard(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<ClientDashboardData> {
  // RLS scopes orders/invoices/cart to the calling user automatically.
  void userId

  const [
    inFlight,
    pendingApprovals,
    completed,
    pipelineCountsRaw,
    awaitingApprovalRaw,
    recentOrdersRaw,
    openInvoicesPending,
    openInvoicesOverdue,
    openInvoicesListRaw,
    cartItemsResult,
  ] = await Promise.all([
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .in('status', ACTIVE_ORDER_STATUSES),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'content_sent'),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
    Promise.all(
      ORDER_PIPELINE.map((stage) =>
        supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('status', stage.status)
          .then((r) => ({ key: stage.status, label: stage.label, count: r.count ?? 0 }))
      )
    ),
    supabase
      .from('orders')
      .select('id, site_domain, status, price, created_at')
      .eq('status', 'content_sent')
      .order('created_at', { ascending: true })
      .limit(8),
    supabase
      .from('orders')
      .select('id, site_domain, status, price, created_at')
      .in('status', ACTIVE_ORDER_STATUSES)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('invoices').select('amount').eq('status', 'pending'),
    supabase.from('invoices').select('amount').eq('status', 'overdue'),
    supabase
      .from('invoices')
      .select(
        `
        id, order_id, amount, due_date, status, created_at,
        order:orders!inner(site_domain)
      `
      )
      .in('status', ['pending', 'overdue'])
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(5),
    supabase.from('carts').select('id, cart_items(id)').maybeSingle(),
  ])

  const pendingRows = openInvoicesPending.data ?? []
  const overdueRows = openInvoicesOverdue.data ?? []
  const openInvoiceTotal =
    pendingRows.reduce((sum, inv) => sum + Number(inv.amount), 0) +
    overdueRows.reduce((sum, inv) => sum + Number(inv.amount), 0)
  const openInvoiceCount = pendingRows.length + overdueRows.length

  const pipeline = pipelineCountsRaw
  const pipelineMax = Math.max(1, ...pipeline.map((s) => s.count))

  const awaitingApproval: ClientOrderRow[] = (awaitingApprovalRaw.data ?? []).map((r) => ({
    id: r.id,
    site_domain: r.site_domain,
    status: r.status,
    price: r.price,
    created_at: r.created_at,
  }))

  const recentOrders: ClientOrderRow[] = (recentOrdersRaw.data ?? []).map((r) => ({
    id: r.id,
    site_domain: r.site_domain,
    status: r.status,
    price: r.price,
    created_at: r.created_at,
  }))

  type RawOpenInvoice = {
    id: string
    order_id: string
    amount: number
    due_date: string | null
    status: 'pending' | 'overdue'
    created_at: string
    order: { site_domain: string } | null
  }
  const openInvoiceRows = (openInvoicesListRaw.data ?? []) as unknown as RawOpenInvoice[]
  const openInvoices: ClientInvoiceRow[] = openInvoiceRows.map((r) => {
    const ageDays = r.due_date
      ? Math.floor((Date.now() - new Date(r.due_date).getTime()) / (1000 * 60 * 60 * 24))
      : null
    return {
      id: r.id,
      order_id: r.order_id,
      amount: r.amount,
      due_date: r.due_date,
      status: r.status,
      site_domain: r.order?.site_domain ?? '—',
      age_days: ageDays,
    }
  })

  const cartItemCount = cartItemsResult.data?.cart_items
    ? (cartItemsResult.data.cart_items as { id: string }[]).length
    : 0

  return {
    ordersInFlight: inFlight.count ?? 0,
    pendingApprovals: pendingApprovals.count ?? 0,
    ordersCompleted: completed.count ?? 0,
    openInvoiceTotal,
    openInvoiceCount,
    cartItemCount,
    pipeline,
    pipelineMax,
    awaitingApproval,
    recentOrders,
    openInvoices,
  }
}
