import { createBrowserClient } from '@supabase/ssr'

import { tryGetPublicSupabaseEnv } from '@/lib/supabase/public-env'

import type { Database } from './types'

/**
 * Local Supabase demo URL/key (public). Used only when `createClient()` runs during SSR/build
 * with no `NEXT_PUBLIC_SUPABASE_*` — e.g. CI prerender — so the constructor never throws; real
 * requests still require env at runtime in the browser.
 */
const PRERENDER_SUPABASE_STUB_URL = 'http://127.0.0.1:54321'
const PRERENDER_SUPABASE_STUB_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDc2NzMyMDAsImV4cCI6MTk2MzI0OTYwMH0.dc_X5iA3DKY_UQu1u9QNlZ9vMhqDBaI1gYKv6ddauEs'

let prerenderStubClient: ReturnType<typeof createBrowserClient<Database>> | undefined

export function createClient() {
  const env = tryGetPublicSupabaseEnv()
  if (env) {
    return createBrowserClient<Database>(env.supabaseUrl, env.supabaseAnonKey)
  }

  if (typeof window === 'undefined') {
    if (!prerenderStubClient) {
      prerenderStubClient = createBrowserClient<Database>(
        PRERENDER_SUPABASE_STUB_URL,
        PRERENDER_SUPABASE_STUB_ANON_KEY
      )
    }
    return prerenderStubClient
  }

  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Add both to your environment (e.g. .env.local) and restart the dev server.'
  )
}
