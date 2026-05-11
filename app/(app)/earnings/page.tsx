import { notFound } from 'next/navigation'

import { EarningsView } from '@/components/earnings/earnings-view'
import {
  loadEarningsSummary,
  normalizeEarningsRange,
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
  if (profile.role !== 'sourcer' && profile.role !== 'admin' && profile.role !== 'manager')
    notFound()

  const params = (await searchParams) ?? {}
  const rawFrom = typeof params.from === 'string' ? params.from : undefined
  const rawTo = typeof params.to === 'string' ? params.to : undefined
  const rawSourcerId = typeof params.sourcerId === 'string' ? params.sourcerId : undefined
  const range = normalizeEarningsRange({ from: rawFrom, to: rawTo })

  const summary = await loadEarningsSummary(supabase, {
    viewerRole: profile.role,
    viewerId: user.id,
    range,
    sourcerId: rawSourcerId ?? null,
  })
  const sourcerOptions =
    profile.role === 'admin' || profile.role === 'manager' ? await loadSourcerOptions() : []

  return (
    <EarningsView
      title={profile.role === 'sourcer' ? 'My earnings' : 'Sourcer earnings'}
      role={profile.role}
      range={range}
      selectedSourcerId={profile.role === 'sourcer' ? user.id : (rawSourcerId ?? null)}
      sourcerOptions={sourcerOptions}
      summary={summary}
    />
  )
}
