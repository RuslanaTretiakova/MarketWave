import type { SupabaseClient } from '@supabase/supabase-js'

import { SETTINGS_TABLE_PAGE_SIZE } from '@/lib/pagination/constants'
import type { Database } from '@/lib/supabase/types'

export type NotificationRow = Database['public']['Tables']['notifications']['Row']

function isMissingNotificationsTable(message: string): boolean {
  return (
    message.includes("Could not find the table 'public.notifications' in the schema cache") ||
    message.includes('relation "public.notifications" does not exist')
  )
}

export async function loadNotificationsPage(
  supabase: SupabaseClient<Database>,
  page: number
): Promise<{ rows: NotificationRow[]; totalCount: number }> {
  const safePage = Math.max(1, Math.floor(page) || 1)
  const from = (safePage - 1) * SETTINGS_TABLE_PAGE_SIZE
  const to = from + SETTINGS_TABLE_PAGE_SIZE - 1

  const { data, error, count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    const message = error.message ?? ''
    if (isMissingNotificationsTable(message)) {
      return { rows: [], totalCount: 0 }
    }
    console.error('[notifications/load]', message)
    return { rows: [], totalCount: 0 }
  }

  return {
    rows: data ?? [],
    totalCount: count ?? 0,
  }
}

export async function loadUnreadNotificationsCount(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_user_id', userId)
    .is('read_at', null)
  if (error) {
    if (isMissingNotificationsTable(error.message ?? '')) return 0
    return 0
  }
  return count ?? 0
}
