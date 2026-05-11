import { notFound } from 'next/navigation'

import { UserDetailClient } from '@/components/settings/user-detail-client'
import {
  loadOrgCopywriterCandidatesForAdmin,
  loadOrgUserAssignmentCountsForAdmin,
  loadOrgUserAssignmentCountsForManager,
  loadOrgUserRowForAdmin,
  loadOrgUserRowForManager,
} from '@/lib/org-users/load-org-users'
import { adminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  return { title: 'User details' }
}

export default async function SettingsUserDetailPage(props: {
  params: Promise<{ userId: string }>
}) {
  const { userId } = await props.params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    notFound()
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const viewerRole = profile?.role
  if (viewerRole !== 'admin' && viewerRole !== 'manager') {
    notFound()
  }

  if (viewerRole === 'admin') {
    const row = await loadOrgUserRowForAdmin(userId)
    if (!row || 'forbidden' in row) {
      notFound()
    }

    const counts = await loadOrgUserAssignmentCountsForAdmin(userId)
    if ('forbidden' in counts) {
      notFound()
    }

    const { data: managerOptions } = await adminClient
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'manager')
      .order('full_name', { ascending: true })

    let copywriterCandidates
    try {
      const result = await loadOrgCopywriterCandidatesForAdmin()
      if ('forbidden' in result) {
        notFound()
      }
      copywriterCandidates = result
    } catch (err) {
      console.error('[settings/users/detail] loadOrgCopywriterCandidatesForAdmin', err)
      throw err instanceof Error ? err : new Error('Failed to load copywriter candidates.')
    }

    return (
      <UserDetailClient
        viewerRole="admin"
        row={row}
        currentUserId={user.id}
        copywriterCandidates={copywriterCandidates}
        counts={counts}
        managerOptions={managerOptions ?? []}
      />
    )
  }

  const row = await loadOrgUserRowForManager(userId)
  if (!row || 'forbidden' in row) {
    notFound()
  }

  const counts = await loadOrgUserAssignmentCountsForManager(userId)
  if ('forbidden' in counts) {
    notFound()
  }

  let accountManagerLabel: string | null = null
  if (row.account_manager_id) {
    const { data: mgr } = await adminClient
      .from('profiles')
      .select('full_name, email')
      .eq('id', row.account_manager_id)
      .maybeSingle()
    accountManagerLabel = mgr?.full_name?.trim() || mgr?.email?.trim() || null
  }

  return (
    <UserDetailClient
      viewerRole="manager"
      row={row}
      currentUserId={user.id}
      copywriterCandidates={[]}
      counts={counts}
      accountManagerLabel={accountManagerLabel}
    />
  )
}
