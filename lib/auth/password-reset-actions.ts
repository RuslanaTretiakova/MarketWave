'use server'

import { mapAuthError } from '@/lib/auth/map-auth-error'
import { isValidEmail } from '@/lib/validation/email'
import { adminClient } from '@/lib/supabase/admin'
import { getSiteOrigin } from '@/lib/site-url'

export type RequestPasswordResetResult = { ok: true } | { ok: false; message: string }

/**
 * Checks auth for the email (service role), then sends the Supabase recovery email if found.
 * Unknown emails return a clear message (product requirement; enables email enumeration).
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

  const { data: existsRaw, error: rpcError } = await adminClient.rpc('auth_user_email_exists', {
    p_email: normalized,
  })

  if (rpcError) {
    return {
      ok: false,
      message: 'Could not verify that email right now. Try again in a few minutes.',
    }
  }

  const exists = existsRaw === true

  if (!exists) {
    return {
      ok: false,
      message:
        'No account found for this email. Check the spelling or ask your admin for an invitation.',
    }
  }

  const redirectTo = `${getSiteOrigin()}/auth/callback?next=${encodeURIComponent('/auth/update-password')}`
  const { error: resetError } = await adminClient.auth.resetPasswordForEmail(normalized, {
    redirectTo,
  })

  if (resetError) {
    const mapped = mapAuthError(resetError)
    return { ok: false, message: mapped.message }
  }

  return { ok: true }
}
