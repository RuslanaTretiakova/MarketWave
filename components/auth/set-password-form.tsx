'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { AuthPrimaryButton } from './auth-primary-button'
import { AuthTextField } from './auth-text-field'
import { PasswordRequirementsHint } from './password-requirements-hint'
import { AUTH_MIN_PASSWORD_LENGTH } from '@/lib/auth/password-min'
import { submitSetPasswordAction } from '@/lib/auth/password-actions'
import { confirmMatches, meetsMinLength, trimPasswordInput } from '@/lib/auth/password-validation'
import { createClient } from '@/lib/supabase/client'

type SetPasswordFormProps = {
  mode: 'first-login' | 'recovery'
}

export function SetPasswordForm({ mode }: SetPasswordFormProps) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [recoveryComplete, setRecoveryComplete] = useState(false)

  function validate(): boolean {
    setPasswordError(null)
    setConfirmError(null)
    const trimmedPassword = trimPasswordInput(password)
    const trimmedConfirm = trimPasswordInput(confirm)
    let ok = true
    if (!meetsMinLength(trimmedPassword)) {
      setPasswordError(`Use at least ${AUTH_MIN_PASSWORD_LENGTH} characters.`)
      ok = false
    }
    if (!confirmMatches(trimmedPassword, trimmedConfirm)) {
      setConfirmError('Passwords do not match.')
      ok = false
    }
    return ok
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!validate()) return

    const trimmedPassword = trimPasswordInput(password)
    setLoading(true)
    const result = await submitSetPasswordAction({ password: trimmedPassword })
    setLoading(false)
    if (!result.ok) {
      setError(result.message)
      return
    }

    const supabase = createClient()
    if (mode === 'recovery') {
      await supabase.auth.signOut()
      setRecoveryComplete(true)
      return
    }

    await supabase.auth.signOut()
    router.replace(`/auth/login?reset=success&next=${encodeURIComponent('/settings/profile')}`)
  }

  const subtitle =
    mode === 'first-login' ? 'For security, pick a password you have not used elsewhere.' : null

  if (recoveryComplete) {
    return (
      <div className="gap-block flex flex-col text-center">
        <p className="text-foreground text-sm leading-relaxed" role="status">
          Your password was updated successfully. Sign in with your new password.
        </p>
        <div className="pt-inset">
          <Link
            href="/auth/login"
            className="text-primary text-sm font-semibold underline-offset-4 hover:underline"
          >
            Go to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="gap-block flex flex-col" noValidate>
      <AuthTextField
        label="New password"
        labelId="new-password"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value)
          setPasswordError(null)
        }}
        error={passwordError}
        errorId="new-password-error"
        minLength={AUTH_MIN_PASSWORD_LENGTH}
      />
      <AuthTextField
        label="Confirm password"
        labelId="confirm-password"
        type="password"
        autoComplete="new-password"
        value={confirm}
        onChange={(e) => {
          setConfirm(e.target.value)
          setConfirmError(null)
        }}
        error={confirmError}
        errorId="confirm-password-error"
      />
      <PasswordRequirementsHint password={password} confirm={confirm} />
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      <AuthPrimaryButton type="submit" disabled={loading}>
        {loading ? 'Saving…' : mode === 'first-login' ? 'Continue' : 'Update password'}
      </AuthPrimaryButton>
      {subtitle ? (
        <p className="text-muted-foreground pt-inset text-sm leading-relaxed">{subtitle}</p>
      ) : null}
    </form>
  )
}
