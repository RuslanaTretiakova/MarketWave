'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

    router.refresh()
    if (mode === 'recovery') {
      await supabase.auth.signOut()
      router.replace('/auth/login?reset=success')
      return
    }
    router.push('/dashboard')
  }

  const subtitle =
    mode === 'first-login'
      ? 'For security, pick a password you have not used elsewhere.'
      : 'Enter a new password for your account.'

  return (
    <form onSubmit={onSubmit} className="gap-block flex flex-col" noValidate>
      <div className="space-y-inset">
        <Label htmlFor="new-password">New password</Label>
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value)
            setPasswordError(null)
          }}
          aria-invalid={passwordError ? true : undefined}
          minLength={MIN_LEN}
        />
        {passwordError ? (
          <p className="text-destructive text-sm" role="alert">
            {passwordError}
          </p>
        ) : null}
      </div>
      <div className="space-y-inset">
        <Label htmlFor="confirm-password">Confirm password</Label>
        <Input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => {
            setConfirm(e.target.value)
            setConfirmError(null)
          }}
          aria-invalid={confirmError ? true : undefined}
        />
        {confirmError ? (
          <p className="text-destructive text-sm" role="alert">
            {confirmError}
          </p>
        ) : null}
      </div>
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" variant="cta" disabled={loading}>
        {loading ? 'Saving…' : mode === 'first-login' ? 'Continue' : 'Update password'}
      </Button>
      <p className="text-muted-foreground text-sm leading-relaxed">{subtitle}</p>
      {mode === 'recovery' ? (
        <div className="border-border mt-layout pt-layout border-t">
          <Link
            href="/auth/login"
            className="text-muted-foreground text-sm font-medium hover:underline"
          >
            Back to sign in
          </Link>
        </div>
      ) : null}
    </form>
  )
}
