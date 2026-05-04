/** Paths that require a Supabase session (`/settings` included; not every prefix appears in the sidebar). */
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
