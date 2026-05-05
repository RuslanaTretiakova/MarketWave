/**
 * Resolves public Supabase URL + anon key for browser and server.
 *
 * Supports both Next/Vercel naming (`NEXT_PUBLIC_SUPABASE_*`) and Supabase CLI-style
 * (`SUPABASE_URL`, `SUPABASE_KEY` = anon). For client bundles, `next.config.ts` also maps
 * `SUPABASE_*` into `NEXT_PUBLIC_*` at build time — never put the service_role key in
 * `SUPABASE_KEY`.
 */

export function resolveSupabaseProjectUrl(): string | undefined {
  const v = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim()
  return v || undefined
}

export function resolveSupabaseAnonKey(): string | undefined {
  const v = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || process.env.SUPABASE_KEY?.trim()
  return v || undefined
}
