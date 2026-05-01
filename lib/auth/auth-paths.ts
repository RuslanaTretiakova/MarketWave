/** OAuth / magic-link handler — must stay reachable without a session until code is exchanged. */
export function isAuthCallbackPath(pathname: string): boolean {
  return pathname === '/auth/callback' || pathname.startsWith('/auth/callback/')
}

/** Routes where a logged-in user may go while `require_password_change` is true. */
const PASSWORD_COMPLETION_PREFIXES = [
  '/auth/first-login-password',
  '/auth/update-password',
] as const

export function isAuthPasswordCompletionPath(pathname: string): boolean {
  return (
    isAuthCallbackPath(pathname) ||
    PASSWORD_COMPLETION_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  )
}

/** Public auth pages (no session required). */
export function isAuthPublicPath(pathname: string): boolean {
  return (
    pathname === '/auth/login' ||
    pathname === '/auth/forgot-password' ||
    isAuthCallbackPath(pathname)
  )
}
