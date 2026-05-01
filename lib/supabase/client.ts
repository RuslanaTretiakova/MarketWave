import { createBrowserClient } from '@supabase/ssr'

import { getPublicSupabaseEnv } from '@/lib/supabase/public-env'

import type { Database } from './types'

export function createClient() {
  const { supabaseUrl, supabaseAnonKey } = getPublicSupabaseEnv()
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
}
