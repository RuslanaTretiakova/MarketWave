import type { SupabaseClient } from '@supabase/supabase-js'

import type { OrderStatus } from '@/lib/orders/order-status-labels'
import type { Database } from '@/lib/supabase/types'

export type CopywriterOrderRow = {
  id: string
  site_domain: string
  status: OrderStatus
  price: number
  created_at: string
}

export type CopywriterPipelineStage = { key: string; label: string; count: number }

const ORDER_PIPELINE: { status: OrderStatus; label: string }[] = [
  { status: 'in_progress', label: 'In progress' },
  { status: 'content_sent', label: 'Sent for review' },
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

export type CopywriterDashboardData = {
  assignedOrders: number
  pendingContentSend: number
  needsRevisionOrders: number
  contentSentOrders: number
  completedOrders: number
  approvalRatePercent: number | null
  pipeline: CopywriterPipelineStage[]
  pipelineMax: number
  /** Orders to write or fix (in_progress + needs_changes), oldest first. */
  upNext: CopywriterOrderRow[]
  /** Orders submitted and awaiting client review. */
  sentForReview: CopywriterOrderRow[]
  /** 12 weekly buckets of orders completed by this copywriter, oldest first. */
  weeklyCompletedCounts: number[]
}

export async function loadCopywriterDashboard(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<CopywriterDashboardData> {
  const now = new Date()
  const twelveWeeksAgo = new Date(now)
  twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 12 * 7)

  const [
    assignedResult,
    pendingSendResult,
    needsRevisionResult,
    completedResult,
    contentSentResult,
    pipelineCountsRaw,
    upNextRaw,
    sentForReviewRaw,
    completedAtRows,
  ] = await Promise.all([
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('copywriter_id', userId)
      .in('status', ACTIVE_ORDER_STATUSES),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('copywriter_id', userId)
      .eq('status', 'in_progress'),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('copywriter_id', userId)
      .eq('status', 'needs_changes'),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('copywriter_id', userId)
      .eq('status', 'completed'),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('copywriter_id', userId)
      .eq('status', 'content_sent'),
    Promise.all(
      ORDER_PIPELINE.map((stage) =>
        supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('copywriter_id', userId)
          .eq('status', stage.status)
          .then((r) => ({ key: stage.status, label: stage.label, count: r.count ?? 0 }))
      )
    ),
    supabase
      .from('orders')
      .select('id, site_domain, status, price, created_at')
      .eq('copywriter_id', userId)
      .in('status', ['in_progress', 'needs_changes'])
      .order('created_at', { ascending: true })
      .limit(8),
    supabase
      .from('orders')
      .select('id, site_domain, status, price, created_at')
      .eq('copywriter_id', userId)
      .eq('status', 'content_sent')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('orders')
      .select('updated_at')
      .eq('copywriter_id', userId)
      .eq('status', 'completed')
      .gte('updated_at', twelveWeeksAgo.toISOString()),
  ])

  const sentCount = contentSentResult.count ?? 0
  const completedCount = completedResult.count ?? 0
  const approvalRatePercent =
    sentCount + completedCount > 0
      ? Math.round((completedCount / (sentCount + completedCount)) * 1000) / 10
      : null

  const pipeline = pipelineCountsRaw
  const pipelineMax = Math.max(1, ...pipeline.map((s) => s.count))

  const upNext: CopywriterOrderRow[] = (upNextRaw.data ?? []).map((r) => ({
    id: r.id,
    site_domain: r.site_domain,
    status: r.status,
    price: r.price,
    created_at: r.created_at,
  }))

  const sentForReview: CopywriterOrderRow[] = (sentForReviewRaw.data ?? []).map((r) => ({
    id: r.id,
    site_domain: r.site_domain,
    status: r.status,
    price: r.price,
    created_at: r.created_at,
  }))

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

  return {
    assignedOrders: assignedResult.count ?? 0,
    pendingContentSend: pendingSendResult.count ?? 0,
    needsRevisionOrders: needsRevisionResult.count ?? 0,
    contentSentOrders: sentCount,
    completedOrders: completedCount,
    approvalRatePercent,
    pipeline,
    pipelineMax,
    upNext,
    sentForReview,
    weeklyCompletedCounts,
  }
}
