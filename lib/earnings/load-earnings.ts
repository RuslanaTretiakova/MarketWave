import type { SupabaseClient } from '@supabase/supabase-js'

import { adminClient } from '@/lib/supabase/admin'
import { SETTINGS_TABLE_PAGE_SIZE } from '@/lib/pagination/constants'
import type { Database } from '@/lib/supabase/types'

type UserRole = Database['public']['Enums']['user_role']

export type SourcerFilterOption = {
  id: string
  label: string
}

export type EarningsSummary = {
  totalEarnings: number
  ordersCount: number
}

export type EarningsRow = {
  id: string
  order_id: string
  site_domain: string
  order_status: string
  publish_date: string | null
  order_price: number
  earned_amount: number
  commission_rate: number
  payout_status: 'unpaid' | 'paid'
  paid_at: string | null
  sourcer_name: string | null
}

/** Convert YYYY-MM to an exclusive date range suitable for `earning_month` filtering. */
export function monthToRange(month: string): { from: string; to: string } {
  const [yearStr, monthStr] = month.split('-')
  const year = Number(yearStr)
  const m = Number(monthStr)
  const from = `${year}-${String(m).padStart(2, '0')}-01`
  const to = m === 12 ? `${year + 1}-01-01` : `${year}-${String(m + 1).padStart(2, '0')}-01`
  return { from, to }
}

/** Returns YYYY-MM for the previous calendar month (default when no param is present). */
export function lastMonth(now = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
  return d.toISOString().slice(0, 7)
}

/** Validates and normalises a YYYY-MM string; falls back to last month. */
export function normalizeEarningsMonth(value: string | undefined, now = new Date()): string {
  if (value && /^\d{4}-\d{2}$/.test(value)) return value
  return lastMonth(now)
}

/** Shift a YYYY-MM string by `delta` months. */
export function shiftMonth(month: string, delta: number): string {
  const [yearStr, monthStr] = month.split('-')
  const d = new Date(Date.UTC(Number(yearStr), Number(monthStr) - 1 + delta, 1))
  return d.toISOString().slice(0, 7)
}

export async function loadEarningsSummary(
  supabase: SupabaseClient<Database>,
  opts: {
    viewerRole: UserRole
    viewerId: string
    month: string
    sourcerId?: string | null
  }
): Promise<EarningsSummary> {
  const effectiveSourcerId =
    opts.viewerRole === 'sourcer' ? opts.viewerId : (opts.sourcerId ?? null)
  const client =
    opts.viewerRole === 'admin' || opts.viewerRole === 'manager' ? adminClient : supabase
  const { from, to } = monthToRange(opts.month)

  let q = client
    .from('sourcer_earnings')
    .select('earned_amount')
    .gte('earning_month', from)
    .lt('earning_month', to)

  if (effectiveSourcerId) q = q.eq('sourcer_id', effectiveSourcerId)

  const { data, error } = await q
  if (error) {
    console.error('[earnings/summary]', error.message)
    return { totalEarnings: 0, ordersCount: 0 }
  }

  const rows = (data ?? []) as Array<{ earned_amount: number }>
  return {
    totalEarnings: rows.reduce((sum, row) => sum + Number(row.earned_amount ?? 0), 0),
    ordersCount: rows.length,
  }
}

export async function loadEarningsRows(
  supabase: SupabaseClient<Database>,
  opts: {
    viewerRole: UserRole
    viewerId: string
    month: string
    sourcerId?: string | null
    page: number
  }
): Promise<{ rows: EarningsRow[]; totalCount: number }> {
  const effectiveSourcerId =
    opts.viewerRole === 'sourcer' ? opts.viewerId : (opts.sourcerId ?? null)
  const client =
    opts.viewerRole === 'admin' || opts.viewerRole === 'manager' ? adminClient : supabase
  const { from, to } = monthToRange(opts.month)
  const pageSize = SETTINGS_TABLE_PAGE_SIZE
  const page = Math.max(1, Math.floor(opts.page) || 1)
  const offset = (page - 1) * pageSize

  let q = client
    .from('sourcer_earnings')
    .select(
      'id, order_id, sourcer_id, earned_amount, commission_rate, payout_status, paid_at, order:orders!sourcer_earnings_order_id_fkey(site_domain, status, publish_date, price)',
      { count: 'exact' }
    )
    .gte('earning_month', from)
    .lt('earning_month', to)
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (effectiveSourcerId) q = q.eq('sourcer_id', effectiveSourcerId)

  const { data, error, count } = await q
  if (error) {
    console.error('[earnings/rows]', error.message)
    return { rows: [], totalCount: 0 }
  }

  type RawRow = {
    id: string
    order_id: string
    sourcer_id: string
    earned_amount: number
    commission_rate: number
    payout_status: string
    paid_at: string | null
    order: {
      site_domain: string
      status: string
      publish_date: string | null
      price: number
    } | null
  }
  const rawRows = (data ?? []) as unknown as RawRow[]

  // Fetch sourcer names only when staff is viewing all sourcers.
  const sourcerMap = new Map<string, string>()
  if ((opts.viewerRole === 'admin' || opts.viewerRole === 'manager') && !effectiveSourcerId) {
    const sourcerIds = [...new Set(rawRows.map((r) => r.sourcer_id).filter(Boolean))]
    if (sourcerIds.length > 0) {
      const { data: profiles } = await adminClient
        .from('profiles')
        .select('id, full_name, email')
        .in('id', sourcerIds)
      ;(profiles ?? []).forEach((p) => {
        sourcerMap.set(p.id, p.full_name ?? p.email ?? p.id.slice(0, 8))
      })
    }
  }

  const rows: EarningsRow[] = rawRows.map((r) => ({
    id: r.id,
    order_id: r.order_id,
    site_domain: r.order?.site_domain ?? '—',
    order_status: r.order?.status ?? '—',
    publish_date: r.order?.publish_date ?? null,
    order_price: r.order?.price ?? 0,
    earned_amount: r.earned_amount,
    commission_rate: r.commission_rate,
    payout_status: r.payout_status as 'unpaid' | 'paid',
    paid_at: r.paid_at,
    sourcer_name: sourcerMap.get(r.sourcer_id) ?? null,
  }))

  return { rows, totalCount: count ?? 0 }
}
