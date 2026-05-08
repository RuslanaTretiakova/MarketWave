import type { SupabaseClient } from '@supabase/supabase-js'

import { adminClient } from '@/lib/supabase/admin'
import type { Database } from '@/lib/supabase/types'
import type { OrderStatus } from '@/lib/orders/order-status-labels'

export type ManagerOrderRow = {
  id: string
  site_domain: string
  status: OrderStatus
  price: number
  client_name: string | null
  copywriter_name: string | null
  created_at: string
}

export type ManagerInvoiceRow = {
  id: string
  order_id: string
  amount: number
  due_date: string | null
  site_domain: string
  client_name: string | null
  status: 'pending' | 'overdue'
  age_days: number | null
}

export type ManagerPipelineStage = {
  status: OrderStatus
  label: string
  count: number
}

const PIPELINE_ORDER: { status: OrderStatus; label: string }[] = [
  { status: 'new', label: 'New' },
  { status: 'in_progress', label: 'In progress' },
  { status: 'content_sent', label: 'Content sent' },
  { status: 'needs_changes', label: 'Needs changes' },
  { status: 'content_approved', label: 'Approved' },
  { status: 'published', label: 'Published' },
]

export type ManagerDashboardData = {
  totalActiveOrders: number
  ordersAwaitingAssignment: number
  ordersAwaitingClientReview: number
  ordersReadyToPublish: number
  unpaidInvoiceTotal: number
  unpaidInvoiceCount: number
  sitesPendingReview: number
  ordersCompletedThisMonth: number
  ordersCompletedPrevMonth: number
  ordersCompletedDelta: number
  pipeline: ManagerPipelineStage[]
  pipelineMax: number
  attentionOrders: ManagerOrderRow[]
  unpaidInvoices: ManagerInvoiceRow[]
  /** 12 weekly buckets of orders completed, oldest first */
  weeklyCompletedCounts: number[]
}

const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  'new',
  'in_progress',
  'content_sent',
  'needs_changes',
  'content_approved',
  'published',
]

function monthBounds(reference = new Date()) {
  const y = reference.getFullYear()
  const m = reference.getMonth()
  return {
    startThisMonth: new Date(y, m, 1).toISOString(),
    startNextMonth: new Date(y, m + 1, 1).toISOString(),
    startPrevMonth: new Date(y, m - 1, 1).toISOString(),
  }
}

export async function loadManagerDashboard(
  supabase: SupabaseClient<Database>
): Promise<ManagerDashboardData> {
  const now = new Date()
  const { startThisMonth, startNextMonth, startPrevMonth } = monthBounds(now)
  const twelveWeeksAgo = new Date(now)
  twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 12 * 7)

  const [
    activeOrders,
    awaitingAssignment,
    awaitingClient,
    readyToPublish,
    sitesPending,
    invoicesPending,
    invoicesOverdue,
    completedThisMonth,
    completedPrevMonth,
    pipelineCountsRaw,
    attentionOrdersResult,
    completedAtRows,
  ] = await Promise.all([
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .in('status', ACTIVE_ORDER_STATUSES),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .is('copywriter_id', null)
      .in('status', ['new', 'in_progress']),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'content_sent'),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'content_approved'),
    supabase.from('sites').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('invoices').select('amount, due_date, paid_at, status').eq('status', 'pending'),
    supabase.from('invoices').select('amount, due_date, paid_at, status').eq('status', 'overdue'),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('updated_at', startThisMonth)
      .lt('updated_at', startNextMonth),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('updated_at', startPrevMonth)
      .lt('updated_at', startThisMonth),
    Promise.all(
      PIPELINE_ORDER.map((stage) =>
        supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('status', stage.status)
          .then((r) => ({ status: stage.status, label: stage.label, count: r.count ?? 0 }))
      )
    ),
    supabase
      .from('orders')
      .select('id, site_domain, status, price, copywriter_id, user_id, created_at')
      .in('status', ['new', 'needs_changes', 'content_approved', 'content_sent'])
      .order('created_at', { ascending: true })
      .limit(8),
    supabase
      .from('orders')
      .select('updated_at')
      .eq('status', 'completed')
      .gte('updated_at', twelveWeeksAgo.toISOString()),
  ])

  const unpaidInvoices = [...(invoicesPending.data ?? []), ...(invoicesOverdue.data ?? [])]
  const unpaidInvoiceTotal = unpaidInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0)

  const pipeline = pipelineCountsRaw
  const pipelineMax = Math.max(1, ...pipeline.map((s) => s.count))

  // Attention orders need names; resolve via service role profile lookup.
  const attentionRaw = attentionOrdersResult.data ?? []
  const userIds = [
    ...new Set(
      attentionRaw.flatMap((r) => [r.user_id, r.copywriter_id]).filter(Boolean) as string[]
    ),
  ]
  const profileMap = new Map<string, string | null>()
  if (userIds.length > 0) {
    const { data: profiles } = await adminClient
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds)
    ;(profiles ?? []).forEach((p) => profileMap.set(p.id, p.full_name))
  }
  const attentionOrders: ManagerOrderRow[] = attentionRaw.map((r) => ({
    id: r.id,
    site_domain: r.site_domain,
    status: r.status,
    price: r.price,
    client_name: profileMap.get(r.user_id) ?? null,
    copywriter_name: r.copywriter_id ? (profileMap.get(r.copywriter_id) ?? null) : null,
    created_at: r.created_at,
  }))

  // Top 5 unpaid invoices for the side card.
  const { data: topUnpaidRaw } = await supabase
    .from('invoices')
    .select(
      `
      id, order_id, amount, due_date, status, created_at,
      order:orders!inner(site_domain, user_id)
    `
    )
    .in('status', ['pending', 'overdue'])
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(5)

  type TopUnpaid = {
    id: string
    order_id: string
    amount: number
    due_date: string | null
    status: 'pending' | 'overdue'
    created_at: string
    order: { site_domain: string; user_id: string } | null
  }

  const topRows = (topUnpaidRaw ?? []) as unknown as TopUnpaid[]
  const topUserIds = [...new Set(topRows.map((r) => r.order?.user_id).filter(Boolean) as string[])]
  const topUserMap = new Map<string, string | null>()
  if (topUserIds.length > 0) {
    const { data: tprofiles } = await adminClient
      .from('profiles')
      .select('id, full_name')
      .in('id', topUserIds)
    ;(tprofiles ?? []).forEach((p) => topUserMap.set(p.id, p.full_name))
  }
  const unpaidInvoicesList: ManagerInvoiceRow[] = topRows.map((r) => {
    const ageDays = r.due_date
      ? Math.floor((Date.now() - new Date(r.due_date).getTime()) / (1000 * 60 * 60 * 24))
      : null
    return {
      id: r.id,
      order_id: r.order_id,
      amount: r.amount,
      due_date: r.due_date,
      site_domain: r.order?.site_domain ?? '—',
      client_name: r.order?.user_id ? (topUserMap.get(r.order.user_id) ?? null) : null,
      status: r.status,
      age_days: ageDays,
    }
  })

  // 12-week completion bucket
  const weeklyCompletedCounts = Array.from({ length: 12 }, () => 0)
  const weekMs = 7 * 24 * 60 * 60 * 1000
  const origin = twelveWeeksAgo.getTime()
  for (const row of completedAtRows.data ?? []) {
    const t = new Date(row.updated_at).getTime()
    let idx = Math.floor((t - origin) / weekMs)
    if (idx < 0) idx = 0
    if (idx > 11) idx = 11
    weeklyCompletedCounts[idx] += 1
  }

  const completedThisMonthCount = completedThisMonth.count ?? 0
  const completedPrevMonthCount = completedPrevMonth.count ?? 0

  return {
    totalActiveOrders: activeOrders.count ?? 0,
    ordersAwaitingAssignment: awaitingAssignment.count ?? 0,
    ordersAwaitingClientReview: awaitingClient.count ?? 0,
    ordersReadyToPublish: readyToPublish.count ?? 0,
    unpaidInvoiceTotal,
    unpaidInvoiceCount: unpaidInvoices.length,
    sitesPendingReview: sitesPending.count ?? 0,
    ordersCompletedThisMonth: completedThisMonthCount,
    ordersCompletedPrevMonth: completedPrevMonthCount,
    ordersCompletedDelta: completedThisMonthCount - completedPrevMonthCount,
    pipeline,
    pipelineMax,
    attentionOrders,
    unpaidInvoices: unpaidInvoicesList,
    weeklyCompletedCounts,
  }
}
