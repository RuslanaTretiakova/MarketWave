import type { Database } from '@/lib/supabase/types'

export type AppShellUser = {
  email: string
  fullName: string | null
  role: Database['public']['Enums']['user_role']
  avatarUrl: string | null
}
