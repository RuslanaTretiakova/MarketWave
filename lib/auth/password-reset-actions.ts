'use server'

import { headers } from 'next/headers'

import { mapAuthError } from '@/lib/auth/map-auth-error'
import {
  fingerprintForPasswordResetEmail,
  readClientIpKey,
  tryConsumePasswordResetRateLimit,
} from '@/lib/auth/public-rate-limit'
import { isValidEmail } from '@/lib/validation/email'
import { logAuthError } from '@/lib/errors/log-auth-error'
import { adminClient } from '@/lib/supabase/admin'
import { resolveSupabaseProjectUrl } from '@/lib/supabase/supabase-public-env-vars'
import { getSiteOrigin } from '@/lib/site-url'

export type RequestPasswordResetResult = { ok: true } | { ok: false; message: string }

/**
 * Request a password reset without revealing whether the email exists (same UI outcome for valid addresses).
 */
export async function requestPasswordResetAction(
  email: string
): Promise<RequestPasswordResetResult> {
  if (!resolveSupabaseProjectUrl() || !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return {
      ok: false,
      message: 'Password reset is not configured on this environment. Contact support.',
    }
  }

  const normalized = email.trim().toLowerCase()
  if (!isValidEmail(normalized)) {
    return { ok: false, message: 'Enter a valid email address.' }
  }

  const h = await headers()
  const ipKey = readClientIpKey((name) => h.get(name))
  const emFp = fingerprintForPasswordResetEmail(normalized)
  const gate = await tryConsumePasswordResetRateLimit(ipKey, emFp)
  if (!gate.allow) {
    return { ok: true }
  }

  const redirectTo = `${getSiteOrigin()}/auth/callback?next=${encodeURIComponent('/auth/update-password')}&flow=${encodeURIComponent('recovery')}`
  const { error: resetError } = await adminClient.auth.resetPasswordForEmail(normalized, {
    redirectTo,
  })

  if (resetError) {
    const low = resetError.message.toLowerCase()
    const likelyMissingUser =
      low.includes('not found') || low.includes('user not found') || low.includes('no user')

    if (likelyMissingUser) {
      console.warn('[password reset] suppressed client error for possible unknown email')
    } else {
      const mapped = mapAuthError(resetError)
      console.error('[password reset]', mapped.message)
      await logAuthError({
        context: 'auth/password-reset',
        message: mapped.message,
        payload: { code: mapped.code },
      })
    }
  }

  return { ok: true }
}
