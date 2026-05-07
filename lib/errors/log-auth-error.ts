'use server'

import { adminClient } from '@/lib/supabase/admin'

const SENSITIVE_KEYS = new Set([
  'password',
  'passwd',
  'pwd',
  'token',
  'access_token',
  'refresh_token',
  'secret',
  'key',
  'apikey',
  'api_key',
  'authorization',
])

function sanitize(
  value: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  if (value == null) return null
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(value)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase())) continue
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = sanitize(v as Record<string, unknown>)
    } else {
      out[k] = v
    }
  }
  return out
}

export async function logAuthError(opts: {
  level?: 'info' | 'warn' | 'error' | 'critical'
  context: string
  message: string
  payload?: Record<string, unknown> | null
  userId?: string | null
}): Promise<void> {
  const { level = 'error', context, message, payload, userId } = opts

  let safe = sanitize(payload)
  if (safe != null) {
    try {
      if (JSON.stringify(safe).length > 4000) safe = { truncated: true }
    } catch {
      safe = { payload_error: true }
    }
  }

  const { error } = await adminClient.from('error_logs').insert({
    level,
    context: context.slice(0, 500),
    message: message.slice(0, 4000),
    payload: safe ?? null,
    user_id: userId ?? null,
  })

  if (error) {
    console.error('[logAuthError] DB write failed', error.message)
  }
}
