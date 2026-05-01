/**
 * Prevent open redirects: only same-origin relative paths are allowed.
 * Default landing route after sign-in is the dashboard.
 */
export function safeReturnPath(next: string | string[] | undefined | null): string {
  if (next == null || Array.isArray(next)) {
    return '/dashboard'
  }
  const trimmed = next.trim()
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return '/dashboard'
  }
  return trimmed
}

const POST_AUTH_ALLOWLIST = new Set([
  '/dashboard',
  '/auth/update-password',
  '/auth/first-login-password',
])

/**
 * After `/auth/callback`, only allowlisted relative paths (stricter than post-login `next`).
 */
export function safePostAuthRedirect(next: string | string[] | null | undefined): string {
  if (next == null || Array.isArray(next)) {
    return '/dashboard'
  }
  const candidate = safeReturnPath(next)
  if (POST_AUTH_ALLOWLIST.has(candidate)) {
    return candidate
  }
  return '/dashboard'
}
