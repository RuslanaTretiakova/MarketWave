import { createHmac } from 'node:crypto'

import { adminClient } from '@/lib/supabase/admin'

export type PublicRateLimitKind =
  | 'password_reset'
  | 'client_error'
  | 'set_password'
  | 'cart_mutation'
  | 'content_save'

export type PublicRateLimitResult = { ok: true } | { ok: false; reason: 'rate_limited' }

/** Password reset: per-IP and per-email-fingerprint (1h, 10 each). */
export const PASSWORD_RESET_WINDOW_MS = 3_600_000
export const PASSWORD_RESET_MAX_PER_KEY = 10

/** Set-password server action: per user id (15m, 20). */
export const SET_PASSWORD_WINDOW_MS = 900_000
export const SET_PASSWORD_MAX_PER_KEY = 20

/** Client error POST: per IP (1m, 40). */
export const CLIENT_ERROR_WINDOW_MS = 60_000
export const CLIENT_ERROR_MAX_PER_KEY = 40

/** Cart mutations: per user ID (1m, 60). Key format: `uid:<userId>`. */
export const CART_MUTATION_WINDOW_MS = 60_000
export const CART_MUTATION_MAX_PER_KEY = 60

/** Content draft saves: per user ID (5m, 120). Key format: `uid:<userId>`. */
export const CONTENT_SAVE_WINDOW_MS = 300_000
export const CONTENT_SAVE_MAX_PER_KEY = 120

function rateLimitHmacSecret(): string {
  return (
    process.env.RATE_LIMIT_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    'dev-placeholder-rate-limit'
  )
}

/** Stable fingerprint for normalized email (no raw email stored in rate table). */
export function fingerprintForPasswordResetEmail(normalizedEmail: string): string {
  return createHmac('sha256', rateLimitHmacSecret()).update(normalizedEmail).digest('hex')
}

async function countRecent(
  kind: PublicRateLimitKind,
  key: string,
  windowMs: number
): Promise<number | null> {
  const sinceIso = new Date(Date.now() - windowMs).toISOString()
  const { count, error } = await adminClient
    .from('public_rate_limit_events')
    .select('*', { count: 'exact', head: true })
    .eq('kind', kind)
    .eq('key', key)
    .gte('created_at', sinceIso)

  if (error) {
    console.warn('[public rate limit] count failed (allowing request):', error.message)
    return null
  }
  return count ?? 0
}

async function insertEvent(kind: PublicRateLimitKind, key: string): Promise<boolean> {
  const { error } = await adminClient.from('public_rate_limit_events').insert({ kind, key })
  if (error) {
    console.warn('[public rate limit] insert failed (allowing request):', error.message)
    return false
  }
  return true
}

/**
 * Under limit → records one event and returns ok.
 * Over limit → rate_limited (caller should not perform the gated side effect).
 */
export async function checkAndRecordPublicRateLimit(input: {
  kind: PublicRateLimitKind
  key: string
  windowMs: number
  max: number
}): Promise<PublicRateLimitResult> {
  const n = await countRecent(input.kind, input.key, input.windowMs)
  if (n === null) {
    return { ok: true }
  }
  if (n >= input.max) {
    return { ok: false, reason: 'rate_limited' }
  }
  await insertEvent(input.kind, input.key)
  return { ok: true }
}

/**
 * Password reset uses two keys (IP + email fingerprint). Both must be under limit; then two rows inserted.
 * If either is over limit, inserts nothing — caller should still return a neutral UI outcome.
 */
export async function tryConsumePasswordResetRateLimit(
  ipKeySuffix: string,
  emailFingerprint: string
): Promise<{ allow: true } | { allow: false }> {
  const ipKey = `ip:${ipKeySuffix}`
  const emKey = `em:${emailFingerprint}`

  const [cIp, cEm] = await Promise.all([
    countRecent('password_reset', ipKey, PASSWORD_RESET_WINDOW_MS),
    countRecent('password_reset', emKey, PASSWORD_RESET_WINDOW_MS),
  ])

  if (cIp === null || cEm === null) {
    await insertEvent('password_reset', ipKey)
    await insertEvent('password_reset', emKey)
    return { allow: true }
  }

  if (cIp >= PASSWORD_RESET_MAX_PER_KEY || cEm >= PASSWORD_RESET_MAX_PER_KEY) {
    console.warn('[password reset] rate limited', {
      ipCount: cIp,
      emCount: cEm,
    })
    return { allow: false }
  }

  await insertEvent('password_reset', ipKey)
  await insertEvent('password_reset', emKey)
  return { allow: true }
}

/** Best-effort client IP key from proxy headers (for rate limiting only). */
export function readClientIpKey(get: (name: string) => string | null): string {
  const xf = get('x-forwarded-for')
  if (xf) {
    const first = xf.split(',')[0]?.trim()
    if (first) return first.slice(0, 200)
  }
  const xr = get('x-real-ip')
  if (xr?.trim()) return xr.trim().slice(0, 200)
  return 'unknown'
}
