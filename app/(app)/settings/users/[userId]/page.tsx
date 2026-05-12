import { notFound } from 'next/navigation'

import { UserDetailClient } from '@/components/settings/user-detail-client'
import {
  loadOrgCopywriterCandidatesForAdmin,
  loadOrgUserAssignmentCountsForAdmin,
  loadOrgUserRowForAdmin,
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

  const [row, counts, cwResult] = await Promise.all([
    loadOrgUserRowForAdmin(userId),
    loadOrgUserAssignmentCountsForAdmin(userId),
    loadOrgCopywriterCandidatesForAdmin(),
  ])

  if (!row || 'forbidden' in row || 'forbidden' in counts || 'forbidden' in cwResult) {
    notFound()
  }

  const { data: managerOptions } = await adminClient
    .from('profiles')
    .select('id, full_name, email')
    .eq('role', 'manager')
    .order('full_name', { ascending: true })

  return (
    <UserDetailClient
      viewerRole={viewerRole}
      row={row}
      currentUserId={user.id}
      copywriterCandidates={cwResult}
      counts={counts}
      managerOptions={managerOptions ?? []}
    />
  )
}
