/**
 * Absolute site origin for Supabase email redirect URLs (reset password, invite).
 * Set `NEXT_PUBLIC_SITE_URL` in production (e.g. `https://app.example.com`).
 * In the browser, defaults to `window.location.origin` when the env var is unset.
 */
export function getSiteOrigin(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (explicit) return explicit.replace(/\/$/, '')
  const vercel = process.env.VERCEL_URL?.trim()
  if (vercel) return `https://${vercel.replace(/\/$/, '')}`
  return 'http://127.0.0.1:3000'
}
