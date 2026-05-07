import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/supabase/types'

export type UserRole = Database['public']['Enums']['user_role']

export type DashboardStats =
  | ClientStats
  | AdminStats
  | ManagerStats
  | CopywriterStats
  | SourcerStats
  | EmptyStats

export type ClientStats = {
  kind: 'client'
  ordersInFlight: number
  ordersCompleted: number
  pendingContentApprovals: number
}

export type AdminStats = {
  kind: 'admin'
  totalActiveOrders: number
  ordersAwaitingAction: number
  sitesInReview: number
  openChangeRequests: number
  pendingInvoices: number
}

export type ManagerStats = {
  kind: 'manager'
  totalActiveOrders: number
  ordersAwaitingAction: number
  sitesInReview: number
  openChangeRequests: number
}

export type CopywriterStats = {
  kind: 'copywriter'
  assignedOrders: number
  pendingContentSend: number
  completedOrders: number
}

export type SourcerStats = {
  kind: 'sourcer'
  sitesSubmitted: number
  sitesActive: number
  sitesPendingReview: number
}

export type EmptyStats = { kind: 'empty' }

const ACTIVE_ORDER_STATUSES = [
  'new',
  'in_progress',
  'content_sent',
  'needs_changes',
  'content_approved',
  'published',
] as const

export async function loadDashboardStats(
  supabase: SupabaseClient<Database>,
  role: UserRole,
  userId: string
): Promise<DashboardStats> {
  if (role === 'client') {
    const [inFlight, completed, pendingApproval] = await Promise.all([
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .in('status', ACTIVE_ORDER_STATUSES),
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'completed'),
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'content_sent'),
    ])
    return {
      kind: 'client',
      ordersInFlight: inFlight.count ?? 0,
      ordersCompleted: completed.count ?? 0,
      pendingContentApprovals: pendingApproval.count ?? 0,
    }
  }

  if (role === 'copywriter') {
    const [assigned, pendingSend, completed] = await Promise.all([
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
        .eq('status', 'completed'),
    ])
    return {
      kind: 'copywriter',
      assignedOrders: assigned.count ?? 0,
      pendingContentSend: pendingSend.count ?? 0,
      completedOrders: completed.count ?? 0,
    }
  }

  if (role === 'admin') {
    const [active, awaiting, inReview, openCR, pendingInv] = await Promise.all([
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .in('status', ACTIVE_ORDER_STATUSES),
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'new'),
      supabase
        .from('sites')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending_review'),
      supabase
        .from('change_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'open'),
      supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
    ])
    return {
      kind: 'admin',
      totalActiveOrders: active.count ?? 0,
      ordersAwaitingAction: awaiting.count ?? 0,
      sitesInReview: inReview.count ?? 0,
      openChangeRequests: openCR.count ?? 0,
      pendingInvoices: pendingInv.count ?? 0,
    }
  }

  if (role === 'manager') {
    const [active, awaiting, inReview, openCR] = await Promise.all([
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .in('status', ACTIVE_ORDER_STATUSES),
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'new'),
      supabase
        .from('sites')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending_review'),
      supabase
        .from('change_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'open'),
    ])
    return {
      kind: 'manager',
      totalActiveOrders: active.count ?? 0,
      ordersAwaitingAction: awaiting.count ?? 0,
      sitesInReview: inReview.count ?? 0,
      openChangeRequests: openCR.count ?? 0,
    }
  }

  if (role === 'sourcer') {
    const [submitted, active, pending] = await Promise.all([
      supabase.from('sites').select('id', { count: 'exact', head: true }).eq('sourcer_id', userId),
      supabase
        .from('sites')
        .select('id', { count: 'exact', head: true })
        .eq('sourcer_id', userId)
        .eq('status', 'active'),
      supabase
        .from('sites')
        .select('id', { count: 'exact', head: true })
        .eq('sourcer_id', userId)
        .eq('status', 'pending_review'),
    ])
    return {
      kind: 'sourcer',
      sitesSubmitted: submitted.count ?? 0,
      sitesActive: active.count ?? 0,
      sitesPendingReview: pending.count ?? 0,
    }
  }

  return { kind: 'empty' }
}
