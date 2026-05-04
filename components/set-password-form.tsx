'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { AuthPrimaryButton, AuthTextField } from '@/components/auth'
import { mapAuthError } from '@/lib/auth/map-auth-error'
import { completePasswordChange } from '@/lib/auth/password-actions'
import { createClient } from '@/lib/supabase/client'

const MIN_LEN = 8

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
    let ok = true
    if (password.length < MIN_LEN) {
      setPasswordError(`Use at least ${MIN_LEN} characters.`)
      ok = false
    }
    if (password !== confirm) {
      setConfirmError('Passwords do not match.')
      ok = false
    }
    return ok
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!validate()) return

    setLoading(true)
    const supabase = createClient()
    const { error: updErr } = await supabase.auth.updateUser({ password })
    if (updErr) {
      setLoading(false)
      setError(mapAuthError(updErr).message)
      return
    }

    const cleared = await completePasswordChange()
    setLoading(false)
    if (!cleared.ok) {
      setError(cleared.message)
      return
    }

    if (mode === 'recovery') {
      router.refresh()
      await supabase.auth.signOut()
      setRecoveryComplete(true)
      return
    }

    await supabase.auth.signOut()
    router.replace('/auth/login?reset=success')
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
        minLength={MIN_LEN}
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
