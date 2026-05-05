import type { Database } from '@/lib/supabase/types'

export type AppShellUser = {
  /** Auth user id — avoids redundant client `getUser()` (session mutex / lock contention). */
  id: string
  email: string
  fullName: string | null
  role: Database['public']['Enums']['user_role']
  avatarUrl: string | null
}
