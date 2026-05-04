'use server'

import { mapAuthError } from '@/lib/auth/map-auth-error'
import { isValidEmail } from '@/lib/validation/email'
import { adminClient } from '@/lib/supabase/admin'
import { getSiteOrigin } from '@/lib/site-url'

export type RequestPasswordResetResult = { ok: true } | { ok: false; message: string }

/**
 * Request a password reset without revealing whether the email exists (same UI outcome for valid addresses).
 */
export async function requestPasswordResetAction(
  email: string
): Promise<RequestPasswordResetResult> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  ) {
    return {
      ok: false,
      message: 'Password reset is not configured on this environment. Contact support.',
    }
  }

  const normalized = email.trim().toLowerCase()
  if (!isValidEmail(normalized)) {
    return { ok: false, message: 'Enter a valid email address.' }
  }

  const redirectTo = `${getSiteOrigin()}/auth/callback?next=${encodeURIComponent('/auth/update-password')}`
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
      console.error('[password reset]', mapAuthError(resetError).message)
    }
  }

  return { ok: true }
}
