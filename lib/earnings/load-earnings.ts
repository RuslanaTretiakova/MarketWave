import type { SupabaseClient } from '@supabase/supabase-js'

import { adminClient } from '@/lib/supabase/admin'
import type { Database } from '@/lib/supabase/types'

type UserRole = Database['public']['Enums']['user_role']

export type EarningsRange = {
  from: string
  to: string
}

export type SourcerFilterOption = {
  id: string
  label: string
}

export type EarningsSummary = {
  totalEarnings: number
  ordersCount: number
}

export type EarningsViewModel = {
  range: EarningsRange
  sourcerId: string | null
  summary: EarningsSummary
}

function firstDayOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
}

function addMonths(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1))
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function isValidDateKey(value: string | undefined): value is string {
  if (!value) return false
  const parsed = new Date(value)
  return !Number.isNaN(parsed.getTime()) && value.length >= 10
}

export function lastMonthRange(now = new Date()): EarningsRange {
  const currentMonth = firstDayOfMonth(now)
  const start = addMonths(currentMonth, -1)
  const end = addMonths(currentMonth, 0)
  return { from: toDateKey(start), to: toDateKey(end) }
}

export function normalizeEarningsRange(input: {
  from?: string
  to?: string
  now?: Date
}): EarningsRange {
  const fallback = lastMonthRange(input.now)
  if (!isValidDateKey(input.from) || !isValidDateKey(input.to)) return fallback
  if (input.from >= input.to) return fallback
  return { from: input.from.slice(0, 10), to: input.to.slice(0, 10) }
}

export function monthStepRange(range: EarningsRange, delta: number): EarningsRange {
  const from = new Date(range.from)
  const to = new Date(range.to)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return range
  return {
    from: toDateKey(addMonths(firstDayOfMonth(from), delta)),
    to: toDateKey(addMonths(firstDayOfMonth(to), delta)),
  }
}

export async function loadEarningsSummary(
  supabase: SupabaseClient<Database>,
  opts: {
    viewerRole: UserRole
    viewerId: string
    range: EarningsRange
    sourcerId?: string | null
  }
): Promise<EarningsSummary> {
  const effectiveSourcerId =
    opts.viewerRole === 'sourcer' ? opts.viewerId : (opts.sourcerId ?? null)
  const client =
    opts.viewerRole === 'admin' || opts.viewerRole === 'manager' ? adminClient : supabase

  let query = client
    .from('orders')
    .select('id, price, sites!orders_site_id_fkey(sourcer_id)')
    .gte('created_at', opts.range.from)
    .lt('created_at', opts.range.to)

  if (effectiveSourcerId) query = query.eq('sites.sourcer_id', effectiveSourcerId)

  const { data, error } = await query
  if (error) {
    console.error('[earnings/summary]', error.message)
    return { totalEarnings: 0, ordersCount: 0 }
  }

  const rows = (data ?? []) as Array<{ price: number }>
  return {
    totalEarnings: rows.reduce((sum, row) => sum + Number(row.price ?? 0), 0),
    ordersCount: rows.length,
  }
}
