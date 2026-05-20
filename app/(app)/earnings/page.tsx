import { notFound } from 'next/navigation'

import { EarningsView } from '@/components/earnings/earnings-view'
import {
  loadEarningsSummary,
  loadEarningsRows,
  normalizeEarningsMonth,
  type SourcerFilterOption,
} from '@/lib/earnings/load-earnings'
import { adminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Earnings',
}

async function loadSourcerOptions(): Promise<SourcerFilterOption[]> {
  const { data, error } = await adminClient
    .from('profiles')
    .select('id, full_name, email')
    .eq('role', 'sourcer')
    .order('full_name', { ascending: true })

  if (error) {
    console.error('[earnings/sourcers]', error.message)
    return []
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    label: row.full_name ?? row.email ?? row.id.slice(0, 8),
  }))
}

export default async function EarningsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile) notFound()
  if (profile.role !== 'sourcer' && profile.role !== 'admin') notFound()

  const params = (await searchParams) ?? {}
  const rawMonth = typeof params.month === 'string' ? params.month : undefined
  const rawSourcerId = typeof params.sourcerId === 'string' ? params.sourcerId : undefined
  const rawPage = typeof params.page === 'string' ? params.page : undefined

  const month = normalizeEarningsMonth(rawMonth)
  const sourcerId = rawSourcerId ?? null
  const page = Math.max(1, Math.floor(Number(rawPage)) || 1)

  const [summary, { rows, totalCount }] = await Promise.all([
    loadEarningsSummary(supabase, {
      viewerRole: profile.role,
      viewerId: user.id,
      month,
      sourcerId,
    }),
    loadEarningsRows(supabase, {
      viewerRole: profile.role,
      viewerId: user.id,
      month,
      sourcerId,
      page,
    }),
  ])

  const sourcerOptions = profile.role === 'admin' ? await loadSourcerOptions() : []

  return (
    <EarningsView
      title={profile.role === 'sourcer' ? 'My earnings' : 'Sourcer earnings'}
      role={profile.role}
      month={month}
      selectedSourcerId={profile.role === 'sourcer' ? user.id : sourcerId}
      sourcerOptions={sourcerOptions}
      summary={summary}
      rows={rows}
      totalCount={totalCount}
      page={page}
    />
  )
}
