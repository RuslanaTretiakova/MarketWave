import { notFound } from 'next/navigation'

import { UserDetailClient } from '@/components/settings/user-detail-client'
import {
  loadOrgCopywriterCandidatesForAdmin,
  loadOrgUserAssignmentCountsForAdmin,
  loadOrgUserRowForAdmin,
} from '@/lib/org-users/load-org-users'
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

  if (profile?.role !== 'admin') {
    notFound()
  }

  const row = await loadOrgUserRowForAdmin(userId)
  if (!row || 'forbidden' in row) {
    notFound()
  }

  const counts = await loadOrgUserAssignmentCountsForAdmin(userId)
  if ('forbidden' in counts) {
    notFound()
  }

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
      row={row}
      currentUserId={user.id}
      copywriterCandidates={copywriterCandidates}
      counts={counts}
    />
  )
}
