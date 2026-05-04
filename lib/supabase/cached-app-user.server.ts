import 'server-only'

import { cache } from 'react'

import { createClientOrNull } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'

export type CachedAppUserProfile = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'require_password_change' | 'full_name' | 'role' | 'avatar_url'
>

/**
 * One `getUser` + `profiles` read per request for the authenticated app shell tree.
 * `React.cache` dedupes layout + pages (e.g. dashboard) on the same navigation.
 */
export const getCachedAppUserContext = cache(async () => {
  const supabase = await createClientOrNull()
  if (!supabase) {
    return {
      supabase: null,
      user: null,
      profile: null as CachedAppUserProfile | null,
      authError: null,
    } as const
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      supabase,
      user: null,
      profile: null as CachedAppUserProfile | null,
      authError,
    } as const
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('require_password_change, full_name, role, avatar_url')
    .eq('id', user.id)
    .maybeSingle()

  return {
    supabase,
    user,
    profile: profile ?? null,
    authError,
  } as const
})
