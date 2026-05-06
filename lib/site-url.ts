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

/** True when origin is loopback — invalid for production email redirect targets. */
export function isLocalLoopbackSiteOrigin(origin: string): boolean {
  try {
    const url = new URL(
      origin.startsWith('http://') || origin.startsWith('https://') ? origin : `https://${origin}`
    )
    return (
      url.hostname === 'localhost' ||
      url.hostname === '127.0.0.1' ||
      url.hostname === '[::1]' ||
      url.hostname === '::1'
    )
  } catch {
    return false
  }
}

/**
 * In production, block sending invites (and similar) when the server-resolved origin is still
 * loopback — otherwise Supabase falls back to dashboard Site URL (often localhost) and users get
 * broken links.
 */
export function productionServerEmailRedirectBlockedMessage(): string | null {
  if (process.env.NODE_ENV !== 'production') return null
  if (typeof window !== 'undefined') return null
  const origin = getSiteOrigin()
  if (!isLocalLoopbackSiteOrigin(origin)) return null
  return (
    'Invites are misconfigured: the app would send email links to localhost. Set NEXT_PUBLIC_SITE_URL ' +
    'to your public deployment origin (no trailing slash) and redeploy. In Supabase → Authentication → ' +
    'URL configuration, set Site URL to that origin and add https://<your-origin>/auth/callback under ' +
    'Redirect URLs. Then send the invite again.'
  )
}
