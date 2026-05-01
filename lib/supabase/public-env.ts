/**
 * Validates public Supabase env for server/client helpers.
 * Avoids opaque failures from @supabase/ssr when URL/key are missing or invalid.
 */

export type PublicSupabaseEnv = { supabaseUrl: string; supabaseAnonKey: string }

export function getPublicEnvState():
  | { ok: true; env: PublicSupabaseEnv }
  | { ok: false; reason: 'missing' | 'bad_url' } {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

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
        'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Add both for every environment (e.g. .env.local locally, Vercel → Project → Settings → Environment Variables for production) and rebuild.'
      )
    }
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not a valid absolute URL.')
  }
  return r.env
}

/** Same rules as {@link getPublicSupabaseEnv} but returns null instead of throwing (optional UI / proxy paths). */
export function tryGetPublicSupabaseEnv(): PublicSupabaseEnv | null {
  const r = getPublicEnvState()
  return r.ok ? r.env : null
}
