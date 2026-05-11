import type { Database } from '@/lib/supabase/types'

export type OrgUserRole = Database['public']['Enums']['user_role']

/** Plain JSON for the Users management client table (loaded server-side). */
export type OrgUserRowJson = {
  id: string
  /** Preferred display email: `profiles.email` when set, else Auth email. */
  email: string | null
  /** Raw `profiles.email` (may be null before backfill). */
  profile_email: string | null
  full_name: string | null
  role: OrgUserRole
  require_password_change: boolean
  last_sign_in_at: string | null
  banned_until: string | null
  avatar_url: string | null
  bio: string | null
  company_name: string | null
  phone: string | null
  created_at: string | null
  /** Client’s assigned manager (Sales onboarding chat). Admin-maintained. */
  account_manager_id: string | null
}
