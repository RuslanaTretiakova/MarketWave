import type { AuthError } from '@supabase/supabase-js'

export type AuthErrorCode =
  | 'invalid_credentials'
  | 'rate_limited'
  | 'email_not_confirmed'
  | 'weak_password'
  | 'user_already_exists'
  | 'user_not_found'
  | 'invite_failed'
  | 'forbidden'
  | 'unknown'

export type MappedAuthError = {
  code: AuthErrorCode
  message: string
}

function includes(msg: string, frag: string) {
  return msg.toLowerCase().includes(frag.toLowerCase())
}

export function mapAuthError(error: AuthError | Error | null | undefined): MappedAuthError {
  if (!error) {
    return { code: 'unknown', message: 'Something went wrong. Try again.' }
  }

  const status = 'status' in error ? (error as AuthError).status : undefined
  if (status === 429) {
    return {
      code: 'rate_limited',
      message:
        'Too many sign-in or email attempts right now. Wait about two minutes, then try once. If you requested a password reset, check your inbox (and spam) and use only the newest link.',
    }
  }

  const msg = 'message' in error && error.message ? error.message : String(error)

  if (
    includes(msg, 'banned') ||
    includes(msg, 'user is disabled') ||
    includes(msg, 'account is disabled')
  ) {
    return {
      code: 'forbidden',
      message: 'This account is disabled. Contact your administrator.',
    }
  }

  if (
    includes(msg, 'rate limit') ||
    includes(msg, 'too many') ||
    includes(msg, 'email rate') ||
    includes(msg, 'over_email_send_rate_limit')
  ) {
    return {
      code: 'rate_limited',
      message:
        'Too many sign-in or email attempts right now. Wait about two minutes, then try once. If you requested a password reset, check your inbox (and spam) and use only the newest link.',
    }
  }
  if (includes(msg, 'invalid login') || includes(msg, 'invalid credentials')) {
    return { code: 'invalid_credentials', message: 'Invalid email or password.' }
  }
  if (includes(msg, 'email not confirmed')) {
    return {
      code: 'email_not_confirmed',
      message: 'Confirm your email address before signing in.',
    }
  }
  if (includes(msg, 'password') && includes(msg, 'weak')) {
    return { code: 'weak_password', message: 'Choose a stronger password.' }
  }
  if (includes(msg, 'already registered') || includes(msg, 'already been registered')) {
    return { code: 'user_already_exists', message: 'This email is already registered.' }
  }
  if (includes(msg, 'user not found') || includes(msg, 'not found')) {
    return { code: 'user_not_found', message: 'No account found for this email.' }
  }
  if (includes(msg, 'session') && (includes(msg, 'expired') || includes(msg, 'invalid'))) {
    return { code: 'unknown', message: 'Your session expired. Sign in again and retry.' }
  }
  if (includes(msg, 'same password') || includes(msg, 'different from the old password')) {
    return {
      code: 'weak_password',
      message: 'Choose a password that is different from your current one.',
    }
  }
  if (includes(msg, 'jwt') && includes(msg, 'expired')) {
    return {
      code: 'unknown',
      message: 'This link expired. Request a new one from the sign-in page.',
    }
  }

  return { code: 'unknown', message: msg || 'Something went wrong. Try again.' }
}
