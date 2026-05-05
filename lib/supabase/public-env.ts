/**
 * Validates public Supabase env for server/client helpers.
 * Avoids opaque failures from @supabase/ssr when URL/key are missing or invalid.
 */

import {
  resolveSupabaseAnonKey,
  resolveSupabaseProjectUrl,
} from '@/lib/supabase/supabase-public-env-vars'

export type PublicSupabaseEnv = { supabaseUrl: string; supabaseAnonKey: string }

export function getPublicEnvState():
  | { ok: true; env: PublicSupabaseEnv }
  | { ok: false; reason: 'missing' | 'bad_url' } {
  const supabaseUrl = resolveSupabaseProjectUrl()
  const supabaseAnonKey = resolveSupabaseAnonKey()

  if (!supabaseUrl || !supabaseAnonKey) {
    return { ok: false, reason: 'missing' }
  }

  try {
    new URL(supabaseUrl)
  } catch {
    return { ok: false, reason: 'bad_url' }
  }

  return { ok: true, env: { supabaseUrl, supabaseAnonKey } }
}

export function getPublicSupabaseEnv(): PublicSupabaseEnv {
  const r = getPublicEnvState()
  if (!r.ok) {
    if (r.reason === 'missing') {
      throw new Error(
        'Missing Supabase URL or anon key. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, or SUPABASE_URL and SUPABASE_KEY (anon), then rebuild.'
      )
    }
    throw new Error('Supabase project URL is not a valid absolute URL.')
  }
  return r.env
}

/** Same rules as {@link getPublicSupabaseEnv} but returns null instead of throwing (optional UI / proxy paths). */
export function tryGetPublicSupabaseEnv(): PublicSupabaseEnv | null {
  const r = getPublicEnvState()
  return r.ok ? r.env : null
}
