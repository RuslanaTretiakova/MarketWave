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
