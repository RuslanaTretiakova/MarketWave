import type { SupabaseClient } from '@supabase/supabase-js'

import { adminClient } from '@/lib/supabase/admin'
import type { Database } from '@/lib/supabase/types'

type UserRole = Database['public']['Enums']['user_role']

export type SourcerEarningRow = {
  id: string
  sourcer_id: string
  order_id: string
  invoice_id: string | null
  earned_amount: number
  commission_rate: number
  earning_month: string
  payout_status: 'paid' | 'unpaid'
  paid_at: string | null
  payout_reference: string | null
  created_at: string
  site_domain: string | null
}

export type SourcerEarningsSummary = {
  totalEarnings: number
  monthlyEarnings: number
  paidEarnings: number
  unpaidEarnings: number
  rows: SourcerEarningRow[]
}

export async function loadSourcerEarnings(
  supabase: SupabaseClient<Database>,
  opts: { viewerRole: UserRole; viewerId: string; sourcerId?: string }
): Promise<SourcerEarningsSummary> {
  const sourcerId = opts.viewerRole === 'sourcer' ? opts.viewerId : opts.sourcerId
  if (!sourcerId)
    return { totalEarnings: 0, monthlyEarnings: 0, paidEarnings: 0, unpaidEarnings: 0, rows: [] }

  const client =
    opts.viewerRole === 'admin' || opts.viewerRole === 'manager' ? adminClient : supabase
  const { data, error } = await client
    .from('sourcer_earnings')
    .select(
      `
      id, sourcer_id, order_id, invoice_id, earned_amount, commission_rate, earning_month,
      payout_status, paid_at, payout_reference, created_at,
      order:orders(site_domain)
    `
    )
    .eq('sourcer_id', sourcerId)
    .order('earning_month', { ascending: false })
    .limit(100)

  if (error) {
    console.error('[earnings/load]', error.message)
    return { totalEarnings: 0, monthlyEarnings: 0, paidEarnings: 0, unpaidEarnings: 0, rows: [] }
  }

  type Raw = {
    id: string
    sourcer_id: string
    order_id: string
    invoice_id: string | null
    earned_amount: number
    commission_rate: number
    earning_month: string
    payout_status: 'paid' | 'unpaid'
    paid_at: string | null
    payout_reference: string | null
    created_at: string
    order: { site_domain: string } | null
  }
  const rows = ((data ?? []) as unknown as Raw[]).map((r) => ({
    ...r,
    site_domain: r.order?.site_domain ?? null,
  }))

  const monthKey = new Date().toISOString().slice(0, 7)
  const totalEarnings = rows.reduce((sum, row) => sum + Number(row.earned_amount), 0)
  const monthlyEarnings = rows
    .filter((row) => row.earning_month.slice(0, 7) === monthKey)
    .reduce((sum, row) => sum + Number(row.earned_amount), 0)
  const paidEarnings = rows
    .filter((row) => row.payout_status === 'paid')
    .reduce((sum, row) => sum + Number(row.earned_amount), 0)
  const unpaidEarnings = rows
    .filter((row) => row.payout_status === 'unpaid')
    .reduce((sum, row) => sum + Number(row.earned_amount), 0)

  return { totalEarnings, monthlyEarnings, paidEarnings, unpaidEarnings, rows }
}
