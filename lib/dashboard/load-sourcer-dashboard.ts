import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/supabase/types'

export type SourcerRecentSubmission = {
  id: string
  domain: string
  dr: number | null
  categoryName: string | null
  price: number
  status: Database['public']['Enums']['site_status']
}

export type SourcerDashboardData = {
  /** Submissions created this calendar month */
  submittedThisMonth: number
  submittedPrevMonth: number
  /** Month-over-month delta for submissions (can be negative) */
  submittedMonthDelta: number
  /** Sites currently live in the catalog */
  sitesActive: number
  /** Sites awaiting admin review */
  sitesPendingReview: number
  /**
   * Share of active listings among all non-archived sites you own.
   * Null when you have no non-archived sites (undefined rate).
   */
  approvalRatePercent: number | null
  /**
   * Simple MoM change in approval rate (percentage points), comparing this calendar month
   * vs previous month (sites created in that month that are now active / non-archived in that cohort).
   * Omitted when baseline is unavailable — UI hides delta.
   */
  approvalRateDeltaPoints: number | null
  recentSubmissions: SourcerRecentSubmission[]
  /** 12 weekly buckets, oldest first */
  weeklySubmissionCounts: number[]
  trendRecentSixWeeksTotal: number
  trendPriorSixWeeksTotal: number
  /** Percent change: recent 6 weeks vs prior 6 weeks submission volume */
  trendPercent: number | null
}

function monthBounds(reference = new Date()) {
  const y = reference.getFullYear()
  const m = reference.getMonth()
  const startThis = new Date(y, m, 1)
  const startNext = new Date(y, m + 1, 1)
  const startPrev = new Date(y, m - 1, 1)
  return {
    startThisMonth: startThis.toISOString(),
    startNextMonth: startNext.toISOString(),
    startPrevMonth: startPrev.toISOString(),
  }
}

export async function loadSourcerDashboard(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<SourcerDashboardData> {
  const now = new Date()
  const { startThisMonth, startNextMonth, startPrevMonth } = monthBounds(now)

  const twelveWeeksAgo = new Date(now)
  twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 12 * 7)

  const [
    submittedThisMonth,
    submittedPrevMonth,
    sitesActive,
    sitesPendingReview,
    nonArchived,
    recentResult,
    createdAtRows,
    activeThisMonth,
    activePrevMonth,
    nonArchivedThisMonth,
    nonArchivedPrevMonth,
  ] = await Promise.all([
    supabase
      .from('sites')
      .select('id', { count: 'exact', head: true })
      .eq('sourcer_id', userId)
      .gte('created_at', startThisMonth)
      .lt('created_at', startNextMonth)
      .then((r) => ({ count: r.count })),
    supabase
      .from('sites')
      .select('id', { count: 'exact', head: true })
      .eq('sourcer_id', userId)
      .gte('created_at', startPrevMonth)
      .lt('created_at', startThisMonth)
      .then((r) => ({ count: r.count })),
    supabase
      .from('sites')
      .select('id', { count: 'exact', head: true })
      .eq('sourcer_id', userId)
      .eq('status', 'active')
      .then((r) => ({ count: r.count })),
    supabase
      .from('sites')
      .select('id', { count: 'exact', head: true })
      .eq('sourcer_id', userId)
      .eq('status', 'pending')
      .then((r) => ({ count: r.count })),
    supabase
      .from('sites')
      .select('id', { count: 'exact', head: true })
      .eq('sourcer_id', userId)
      .neq('status', 'archived')
      .then((r) => ({ count: r.count })),
    supabase
      .from('sites')
      .select('id, domain, dr, price, status, categories(name)')
      .eq('sourcer_id', userId)
      .order('updated_at', { ascending: false })
      .limit(5),
    supabase
      .from('sites')
      .select('created_at')
      .eq('sourcer_id', userId)
      .gte('created_at', twelveWeeksAgo.toISOString()),
    supabase
      .from('sites')
      .select('id', { count: 'exact', head: true })
      .eq('sourcer_id', userId)
      .eq('status', 'active')
      .gte('created_at', startThisMonth)
      .lt('created_at', startNextMonth)
      .then((r) => ({ count: r.count })),
    supabase
      .from('sites')
      .select('id', { count: 'exact', head: true })
      .eq('sourcer_id', userId)
      .eq('status', 'active')
      .gte('created_at', startPrevMonth)
      .lt('created_at', startThisMonth)
      .then((r) => ({ count: r.count })),
    supabase
      .from('sites')
      .select('id', { count: 'exact', head: true })
      .eq('sourcer_id', userId)
      .neq('status', 'archived')
      .gte('created_at', startThisMonth)
      .lt('created_at', startNextMonth)
      .then((r) => ({ count: r.count })),
    supabase
      .from('sites')
      .select('id', { count: 'exact', head: true })
      .eq('sourcer_id', userId)
      .neq('status', 'archived')
      .gte('created_at', startPrevMonth)
      .lt('created_at', startThisMonth)
      .then((r) => ({ count: r.count })),
  ])

  const submittedThisMonthCount = submittedThisMonth.count ?? 0
  const submittedPrevMonthCount = submittedPrevMonth.count ?? 0

  const approvalRatePercent =
    nonArchived.count != null && nonArchived.count > 0
      ? Math.round(((sitesActive.count ?? 0) / nonArchived.count) * 1000) / 10
      : null

  let approvalRateDeltaPoints: number | null = null
  if (
    nonArchivedThisMonth.count != null &&
    nonArchivedPrevMonth.count != null &&
    nonArchivedThisMonth.count > 0 &&
    nonArchivedPrevMonth.count > 0
  ) {
    const rateThis = ((activeThisMonth.count ?? 0) / nonArchivedThisMonth.count) * 100
    const ratePrev = ((activePrevMonth.count ?? 0) / nonArchivedPrevMonth.count) * 100
    approvalRateDeltaPoints = Math.round((rateThis - ratePrev) * 10) / 10
  }

  const recentSubmissions: SourcerRecentSubmission[] =
    recentResult.error || !recentResult.data
      ? []
      : recentResult.data.map((row) => {
          const cat = row.categories as { name: string } | null
          return {
            id: row.id,
            domain: row.domain,
            dr: row.dr,
            categoryName: cat?.name ?? null,
            price: row.price,
            status: row.status,
          }
        })

  const weeklySubmissionCounts = Array.from({ length: 12 }, () => 0)
  const weekMs = 7 * 24 * 60 * 60 * 1000
  const origin = twelveWeeksAgo.getTime()
  for (const row of createdAtRows.data ?? []) {
    const t = new Date(row.created_at).getTime()
    let idx = Math.floor((t - origin) / weekMs)
    if (idx < 0) idx = 0
    if (idx > 11) idx = 11
    weeklySubmissionCounts[idx] += 1
  }

  const trendPriorSixWeeksTotal = weeklySubmissionCounts.slice(0, 6).reduce((a, b) => a + b, 0)
  const trendRecentSixWeeksTotal = weeklySubmissionCounts.slice(6, 12).reduce((a, b) => a + b, 0)
  const trendPercent =
    trendPriorSixWeeksTotal > 0
      ? Math.round(
          ((trendRecentSixWeeksTotal - trendPriorSixWeeksTotal) / trendPriorSixWeeksTotal) * 1000
        ) / 10
      : null

  return {
    submittedThisMonth: submittedThisMonthCount,
    submittedPrevMonth: submittedPrevMonthCount,
    submittedMonthDelta: submittedThisMonthCount - submittedPrevMonthCount,
    sitesActive: sitesActive.count ?? 0,
    sitesPendingReview: sitesPendingReview.count ?? 0,
    approvalRatePercent,
    approvalRateDeltaPoints,
    recentSubmissions,
    weeklySubmissionCounts,
    trendRecentSixWeeksTotal,
    trendPriorSixWeeksTotal,
    trendPercent,
  }
}
