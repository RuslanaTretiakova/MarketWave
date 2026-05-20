import type { SupabaseClient } from '@supabase/supabase-js'

import { adminClient } from '@/lib/supabase/admin'
import type { OrderStatus } from '@/lib/orders/order-status-labels'
import type { SiteStatus } from '@/lib/sites/site-status-labels'
import type { Database } from '@/lib/supabase/types'

export type AdminAttentionSiteRow = {
  id: string
  domain: string
  status: SiteStatus
  dr: number | null
  price: number
  sourcer_name: string | null
  created_at: string
  age_days: number
}

export type AdminUnpaidInvoiceRow = {
  id: string
  order_id: string
  amount: number
  due_date: string | null
  site_domain: string
  client_name: string | null
  status: 'draft' | 'sent'
  age_days: number | null
}

export type AdminPipelineStage = { key: string; label: string; count: number }

const ORDER_PIPELINE: { status: OrderStatus; label: string }[] = [
  { status: 'new', label: 'New' },
  { status: 'in_progress', label: 'In progress' },
  { status: 'content_sent', label: 'Content sent' },
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

export type AdminDashboardData = {
  totalActiveOrders: number
  sitesInReview: number
  pendingInvoiceCount: number
  pendingInvoiceTotal: number
  paidRevenue: number
  paidInvoices: number
  publishedOrders: number
  activeChatRooms: number
  pipeline: AdminPipelineStage[]
  pipelineMax: number
  attentionSites: AdminAttentionSiteRow[]
  unpaidInvoices: AdminUnpaidInvoiceRow[]
  weeklyCompletedCounts: number[]
  ordersCompletedThisMonth: number
  ordersCompletedPrevMonth: number
  ordersCompletedDelta: number
}

function monthBounds(reference = new Date()) {
  const y = reference.getFullYear()
  const m = reference.getMonth()
  return {
    startThisMonth: new Date(y, m, 1).toISOString(),
    startNextMonth: new Date(y, m + 1, 1).toISOString(),
    startPrevMonth: new Date(y, m - 1, 1).toISOString(),
  }
}

export async function loadAdminDashboard(
  supabase: SupabaseClient<Database>
): Promise<AdminDashboardData> {
  const now = new Date()
  const { startThisMonth, startNextMonth, startPrevMonth } = monthBounds(now)
  const twelveWeeksAgo = new Date(now)
  twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 12 * 7)

  const [
    activeOrders,
    sitesPending,
    invoicesDraft,
    invoicesSent,
    paidInvoicesResult,
    publishedOrders,
    activeRooms,
    pipelineCountsRaw,
    attentionSitesRaw,
    completedThisMonth,
    completedPrevMonth,
    completedAtRows,
  ] = await Promise.all([
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .in('status', ACTIVE_ORDER_STATUSES),
    supabase.from('sites').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('invoices').select('amount').eq('status', 'draft'),
    supabase.from('invoices').select('amount').eq('status', 'sent'),
    supabase.from('invoices').select('amount').eq('status', 'paid'),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('chat_rooms').select('id', { count: 'exact', head: true }).eq('status', 'active'),
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
      .from('sites')
      .select('id, domain, dr, price, status, sourcer_id, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(8),
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
    supabase
      .from('orders')
      .select('updated_at')
      .eq('status', 'completed')
      .gte('updated_at', twelveWeeksAgo.toISOString()),
  ])

  const pendingInvoiceRows = invoicesDraft.data ?? []
  const overdueInvoiceRows = invoicesSent.data ?? []
  const paidRows = paidInvoicesResult.data ?? []
  const pendingInvoiceTotal =
    pendingInvoiceRows.reduce((sum, inv) => sum + Number(inv.amount), 0) +
    overdueInvoiceRows.reduce((sum, inv) => sum + Number(inv.amount), 0)
  const pendingInvoiceCount = pendingInvoiceRows.length + overdueInvoiceRows.length
  const paidRevenue = paidRows.reduce((sum, inv) => sum + Number(inv.amount), 0)

  const pipeline = pipelineCountsRaw
  const pipelineMax = Math.max(1, ...pipeline.map((s) => s.count))

  // Attention sites — resolve sourcer names via service role
  const sitesRaw = attentionSitesRaw.data ?? []
  const sourcerIds = [
    ...new Set(sitesRaw.map((r) => r.sourcer_id).filter((v): v is string => Boolean(v))),
  ]
  const sourcerNameMap = new Map<string, string | null>()
  if (sourcerIds.length > 0) {
    const { data: profiles } = await adminClient
      .from('profiles')
      .select('id, full_name')
      .in('id', sourcerIds)
    ;(profiles ?? []).forEach((p) => sourcerNameMap.set(p.id, p.full_name))
  }
  const attentionSites: AdminAttentionSiteRow[] = sitesRaw.map((r) => ({
    id: r.id,
    domain: r.domain,
    status: r.status,
    dr: r.dr,
    price: r.price,
    sourcer_name: r.sourcer_id ? (sourcerNameMap.get(r.sourcer_id) ?? null) : null,
    created_at: r.created_at,
    age_days: Math.max(
      0,
      Math.floor((Date.now() - new Date(r.created_at).getTime()) / (1000 * 60 * 60 * 24))
    ),
  }))

  // Top unpaid invoices side card
  const { data: topUnpaidRaw } = await supabase
    .from('invoices')
    .select(
      `
      id, order_id, amount, due_date, status, created_at,
      order:orders!inner(site_domain, user_id)
    `
    )
    .in('status', ['draft', 'sent'])
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(5)

  type TopUnpaid = {
    id: string
    order_id: string
    amount: number
    due_date: string | null
    status: 'draft' | 'sent'
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

  const unpaidInvoices: AdminUnpaidInvoiceRow[] = topRows.map((r) => {
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
    sitesInReview: sitesPending.count ?? 0,
    pendingInvoiceCount,
    pendingInvoiceTotal,
    paidRevenue,
    paidInvoices: paidRows.length,
    publishedOrders: publishedOrders.count ?? 0,
    activeChatRooms: activeRooms.count ?? 0,
    pipeline,
    pipelineMax,
    attentionSites,
    unpaidInvoices,
    weeklyCompletedCounts,
    ordersCompletedThisMonth: completedThisMonthCount,
    ordersCompletedPrevMonth: completedPrevMonthCount,
    ordersCompletedDelta: completedThisMonthCount - completedPrevMonthCount,
  }
}
