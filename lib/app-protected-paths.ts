/** Paths that require a Supabase session (aligned with `APP_NAV_ITEMS`). */
export const APP_PROTECTED_PREFIXES = [
  '/dashboard',
  '/sites',
  '/orders',
  '/cart',
  '/settings',
] as const

export function isAppProtectedPath(pathname: string): boolean {
  return APP_PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}
