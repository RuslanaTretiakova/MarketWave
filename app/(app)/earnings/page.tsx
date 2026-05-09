import { notFound } from 'next/navigation'

import { EarningsView } from '@/components/earnings/earnings-view'
import { loadSourcerEarnings } from '@/lib/earnings/load-earnings'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Earnings',
}

export default async function EarningsPage() {
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

  const summary = await loadSourcerEarnings(supabase, {
    viewerRole: profile.role,
    viewerId: user.id,
    sourcerId: profile.role === 'sourcer' ? user.id : undefined,
  })

  return (
    <EarningsView
      title={profile.role === 'sourcer' ? 'My earnings' : 'Sourcer earnings'}
      summary={summary}
      canManage={profile.role === 'admin' || profile.role === 'manager'}
    />
  )
}
