import { notFound } from 'next/navigation'

import { UsersManagement } from '@/components/settings/users-management'
import { SETTINGS_TABLE_PAGE_SIZE } from '@/lib/pagination/constants'
import { searchParamFirstString } from '@/lib/pagination/search-param-first-string'
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
  page?: string | string[]
  q?: string | string[]
  role?: string | string[]
  status?: string | string[]
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

  const role = profile?.role
  if (role !== 'admin' && role !== 'manager') {
    notFound()
  }

  const page = parseSettingsTablePage(searchParamFirstString(sp.page))
  const qRaw = searchParamFirstString(sp.q)
  const q = qRaw !== undefined ? qRaw : ''
  const roleFilter = parseOrgUsersListRoleFilter(searchParamFirstString(sp.role))
  const status = parseOrgUsersListStatusFilter(searchParamFirstString(sp.status))

  let listResult
  let copywriterCandidates: Awaited<ReturnType<typeof loadOrgCopywriterCandidatesForAdmin>>
  try {
    const [listRes, cwRes] = await Promise.all([
      loadOrgUsersListForAdmin({
        page,
        pageSize: SETTINGS_TABLE_PAGE_SIZE,
        q,
        role: roleFilter,
        status,
      }),
      loadOrgCopywriterCandidatesForAdmin(),
    ])
    if ('forbidden' in listRes || 'forbidden' in cwRes) {
      notFound()
    }
    listResult = listRes
    copywriterCandidates = cwRes
  } catch (err) {
    console.error('[settings/users] load list', err)
    throw err instanceof Error ? err : new Error('Failed to load organization users.')
  }

  return (
    <UsersManagement
      listMode={role === 'admin' ? 'admin' : 'manager'}
      initialRows={listResult.rows}
      totalCount={listResult.totalCount}
      page={listResult.page}
      pageSize={SETTINGS_TABLE_PAGE_SIZE}
      q={q}
      roleFilter={roleFilter}
      statusFilter={status}
      copywriterCandidates={copywriterCandidates}
      currentUserId={user.id}
    />
  )
}
