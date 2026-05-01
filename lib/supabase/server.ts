import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

import { getPublicSupabaseEnv } from '@/lib/supabase/public-env'

import type { Database } from './types'

export async function createClient() {
  const { supabaseUrl, supabaseAnonKey } = getPublicSupabaseEnv()
  const cookieStore = await cookies()

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Server Components cannot mutate cookies; proxy refreshes the session instead.
        }
      },
    },
  })
}
