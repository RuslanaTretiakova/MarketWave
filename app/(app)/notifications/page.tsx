import { notFound } from 'next/navigation'

import { NotificationsList } from '@/components/notifications/notifications-list'
import { loadNotificationsPage } from '@/lib/notifications/load-notifications'
import { searchParamFirstString } from '@/lib/pagination/search-param-first-string'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type SearchParams = {
  page?: string | string[]
}

export default async function NotificationsPage(props: { searchParams: Promise<SearchParams> }) {
  const sp = await props.searchParams
  const pageRaw = searchParamFirstString(sp.page)
  const page = Math.max(1, Math.floor(Number(pageRaw)) || 1)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()

  const { rows, totalCount } = await loadNotificationsPage(supabase, page)

  return <NotificationsList rows={rows} page={page} totalCount={totalCount} />
}
