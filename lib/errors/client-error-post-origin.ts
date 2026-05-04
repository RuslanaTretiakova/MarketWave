/**
 * Guards POST `/api/client-error` so unrelated sites cannot spam `error_logs`.
 * Prefer setting `NEXT_PUBLIC_SITE_URL` so production origin matches deployment.
 */
export function clientErrorPostOriginAllowed(originHeader: string | null): boolean {
  if (!originHeader) {
    return false
  }

  try {
    const incoming = new URL(originHeader).origin

    const site = process.env.NEXT_PUBLIC_SITE_URL?.trim()
    if (site) {
      const candidate = /^https?:\/\//u.test(site) ? site : `https://${site}`
      if (incoming === new URL(candidate).origin) {
        return true
      }
    }

    const vercelHost = process.env.VERCEL_URL?.trim()
      .replace(/^https?:\/\//u, '')
      .replace(/\/$/, '')
    if (vercelHost && incoming === new URL(`https://${vercelHost}`).origin) {
      return true
    }

    if (process.env.NODE_ENV !== 'production') {
      const host = new URL(originHeader).hostname
      return host === 'localhost' || host === '127.0.0.1'
    }

    return false
  } catch {
    return false
  }
}
