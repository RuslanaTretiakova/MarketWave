import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

import { agentDebugLog } from '@/lib/agent-debug-log.server'
import { getPublicEnvState, getPublicSupabaseEnv } from '@/lib/supabase/public-env'

import type { Database } from './types'

async function createServerSupabaseClient(supabaseUrl: string, supabaseAnonKey: string) {
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

export async function createClient() {
  const { supabaseUrl, supabaseAnonKey } = getPublicSupabaseEnv()
  return createServerSupabaseClient(supabaseUrl, supabaseAnonKey)
}

/** Use when missing Supabase env should not crash the render (marketing shell, sign-up copy, etc.). */
export async function createClientOrNull() {
  const state = getPublicEnvState()
  agentDebugLog({
    hypothesisId: 'H1',
    location: 'lib/supabase/server.ts:createClientOrNull',
    envOk: state.ok,
    ...(!state.ok ? { envReason: state.reason } : {}),
  })

  if (!state.ok) return null
  return createServerSupabaseClient(state.env.supabaseUrl, state.env.supabaseAnonKey)
}
