import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { resolveSupabaseProjectUrl } from '@/lib/supabase/supabase-public-env-vars'

import type { Database } from './types'

function createServiceRoleClient(): SupabaseClient<Database> {
  const supabaseUrl = resolveSupabaseProjectUrl()
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      'Missing Supabase project URL or SUPABASE_SERVICE_ROLE_KEY. Add NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL, plus SUPABASE_SERVICE_ROLE_KEY (e.g. Vercel → Environment Variables), then redeploy.'
    )
  }
  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

let singleton: SupabaseClient<Database> | undefined

function getSingleton(): SupabaseClient<Database> {
  if (!singleton) {
    singleton = createServiceRoleClient()
  }
  return singleton
}

// Service role client — server-side only, never import in client components.
// Used in Server Actions that need to bypass RLS (order creation, privileged mutations).
// Lazily created on first property access so importing this module during `next build` does not
// invoke `createClient` when env is not loaded yet (avoids "supabaseUrl is required" at module eval).
export const adminClient: SupabaseClient<Database> = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop, receiver) {
    const client = getSingleton()
    const value = Reflect.get(client, prop, receiver) as unknown
    return typeof value === 'function'
      ? (value as (...args: unknown[]) => unknown).bind(client)
      : value
  },
})
