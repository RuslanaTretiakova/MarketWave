import { notFound } from 'next/navigation'

import { UsersManagement } from '@/components/settings/users-management'
import { loadOrgUsersForAdminPage } from '@/lib/org-users/load-org-users'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Users',
}

export default async function SettingsUsersPage() {
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

  let rows
  try {
    const result = await loadOrgUsersForAdminPage()
    if ('forbidden' in result) {
      notFound()
    }
    rows = result
  } catch (err) {
    console.error('[settings/users] loadOrgUsersForAdminPage', err)
    throw err instanceof Error ? err : new Error('Failed to load organization users.')
  }

  return <UsersManagement initialRows={rows} currentUserId={user.id} />
}
