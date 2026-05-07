import type { MappedAuthError } from '@/lib/auth/map-auth-error'

export function reportAuthErrorClient(mapped: MappedAuthError, context: string): void {
  void fetch('/api/client-error', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      level: 'warn',
      context,
      message: mapped.message,
      payload: { code: mapped.code },
    }),
  }).catch(() => {
    // fire-and-forget — logging must never surface to the user
  })
}
