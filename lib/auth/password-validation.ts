import { AUTH_MIN_PASSWORD_LENGTH } from '@/lib/auth/password-min'

/** Trim for parity with server-side password handling (`submitSetPasswordAction`, etc.). */
export function trimPasswordInput(value: string): string {
  return value.trim()
}

export function meetsMinLength(passwordTrimmed: string): boolean {
  return passwordTrimmed.length >= AUTH_MIN_PASSWORD_LENGTH
}

export function confirmMatches(passwordTrimmed: string, confirmTrimmed: string): boolean {
  return passwordTrimmed === confirmTrimmed && passwordTrimmed.length > 0
}
