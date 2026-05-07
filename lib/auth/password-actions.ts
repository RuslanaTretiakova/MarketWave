'use server'

import { mapAuthError } from '@/lib/auth/map-auth-error'
import {
  SET_PASSWORD_MAX_PER_KEY,
  SET_PASSWORD_WINDOW_MS,
  checkAndRecordPublicRateLimit,
} from '@/lib/auth/public-rate-limit'
import { logAuthError } from '@/lib/errors/log-auth-error'
import { adminClient } from '@/lib/supabase/admin'
import { AUTH_MIN_PASSWORD_LENGTH } from '@/lib/auth/password-min'
import { createClient } from '@/lib/supabase/server'

export type SubmitSetPasswordResult = { ok: true } | { ok: false; message: string }

/**
 * Sets the signed-in user's password via Auth Admin API and clears `require_password_change`.
 * Replaces client-side `updateUser` + untrusted profile clear.
 */
export async function submitSetPasswordAction(input: {
  password: string
}): Promise<SubmitSetPasswordResult> {
  const password = input.password.trim()
  if (password.length < AUTH_MIN_PASSWORD_LENGTH) {
    return { ok: false, message: `Use at least ${AUTH_MIN_PASSWORD_LENGTH} characters.` }
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()
  if (userErr || !user) {
    return { ok: false, message: 'Not signed in.' }
  }

  const rate = await checkAndRecordPublicRateLimit({
    kind: 'set_password',
    key: user.id,
    windowMs: SET_PASSWORD_WINDOW_MS,
    max: SET_PASSWORD_MAX_PER_KEY,
  })
  if (!rate.ok) {
    return {
      ok: false,
      message: 'Too many password attempts right now. Wait about fifteen minutes, then try again.',
    }
  }

  const { error: authUpdErr } = await adminClient.auth.admin.updateUserById(user.id, {
    password,
  })
  if (authUpdErr) {
    const mapped = mapAuthError(authUpdErr)
    await logAuthError({
      context: 'auth/set-password',
      message: mapped.message,
      payload: { code: mapped.code },
      userId: user.id,
    })
    return { ok: false, message: mapped.message }
  }

  const { error: profErr } = await adminClient
    .from('profiles')
    .update({ require_password_change: false })
    .eq('id', user.id)

  if (profErr) {
    return { ok: false, message: 'Could not update your account. Try again.' }
  }

  return { ok: true }
}
