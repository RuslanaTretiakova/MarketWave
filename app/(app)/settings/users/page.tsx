import { notFound } from 'next/navigation'

import { UsersManagement } from '@/components/settings/users-management'
import { SETTINGS_TABLE_PAGE_SIZE } from '@/lib/pagination/constants'
import {
  loadOrgCopywriterCandidatesForAdmin,
  loadOrgUsersListForAdmin,
  parseOrgUsersListRoleFilter,
  parseOrgUsersListStatusFilter,
  parseSettingsTablePage,
} from '@/lib/org-users/load-org-users'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Users',
}

type SearchParams = {
  page?: string
  q?: string
  role?: string
  status?: string
}

export default async function SettingsUsersPage(props: { searchParams: Promise<SearchParams> }) {
  const sp = await props.searchParams

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

  const page = parseSettingsTablePage(sp.page)
  const q = typeof sp.q === 'string' ? sp.q : ''
  const role = parseOrgUsersListRoleFilter(sp.role)
  const status = parseOrgUsersListStatusFilter(sp.status)

  let listResult
  let copywriterCandidates
  try {
    const listRes = await loadOrgUsersListForAdmin({
      page,
      pageSize: SETTINGS_TABLE_PAGE_SIZE,
      q,
      role,
      status,
    })
    if ('forbidden' in listRes) {
      notFound()
    }
    listResult = listRes

    const cwRes = await loadOrgCopywriterCandidatesForAdmin()
    if ('forbidden' in cwRes) {
      notFound()
    }
    copywriterCandidates = cwRes
  } catch (err) {
    console.error('[settings/users] load list', err)
    throw err instanceof Error ? err : new Error('Failed to load organization users.')
  }

  return (
    <UsersManagement
      initialRows={listResult.rows}
      totalCount={listResult.totalCount}
      page={listResult.page}
      pageSize={SETTINGS_TABLE_PAGE_SIZE}
      q={q}
      roleFilter={role}
      statusFilter={status}
      copywriterCandidates={copywriterCandidates}
      currentUserId={user.id}
    />
  )
}
