import { createBrowserClient } from '@supabase/ssr'

import { tryGetPublicSupabaseEnv } from '@/lib/supabase/public-env'

import type { Database } from './types'

/**
 * Local Supabase demo URL/key (public). Used only when `createClient()` runs during SSR/build
 * with no resolved public Supabase env — e.g. CI prerender — so the constructor never throws; real
 * requests still require env at runtime in the browser.
 */
const PRERENDER_SUPABASE_STUB_URL = 'http://127.0.0.1:54321'
const PRERENDER_SUPABASE_STUB_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDc2NzMyMDAsImV4cCI6MTk2MzI0OTYwMH0.dc_X5iA3DKY_UQu1u9QNlZ9vMhqDBaI1gYKv6ddauEs'

let prerenderStubClient: ReturnType<typeof createBrowserClient<Database>> | undefined

/** Survives dev HMR (module `let` resets); still one client per tab runtime. */
const BROWSER_CLIENT_GLOBAL = '__linkbuilding_supabase_browser_client__'

type BrowserSupabaseClient = ReturnType<typeof createBrowserClient<Database>>

function getOrCreateBrowserSingleton(
  supabaseUrl: string,
  supabaseAnonKey: string
): BrowserSupabaseClient {
  const record = globalThis as typeof globalThis & {
    [BROWSER_CLIENT_GLOBAL]?: BrowserSupabaseClient
  }
  record[BROWSER_CLIENT_GLOBAL] ??= createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
  return record[BROWSER_CLIENT_GLOBAL]
}

export function createClient() {
  const env = tryGetPublicSupabaseEnv()
  if (env) {
    if (typeof window !== 'undefined') {
      return getOrCreateBrowserSingleton(env.supabaseUrl, env.supabaseAnonKey)
    }
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
    'Missing Supabase URL or anon key. Set NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY, or SUPABASE_URL + SUPABASE_KEY (anon), in `.env.local` or Vercel → Environment Variables (Production / Preview), then redeploy so the browser bundle picks them up.'
  )
}
