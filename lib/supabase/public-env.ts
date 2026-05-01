/**
 * Validates public Supabase env for server/client helpers.
 * Avoids opaque failures from @supabase/ssr when URL/key are missing or invalid.
 */
export function getPublicSupabaseEnv(): { supabaseUrl: string; supabaseAnonKey: string } {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Add both for every environment (e.g. .env.local locally, Vercel → Project → Settings → Environment Variables for production) and rebuild.'
    )
  }

  try {
    new URL(supabaseUrl)
  } catch {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not a valid absolute URL.')
  }

  return { supabaseUrl, supabaseAnonKey }
}
