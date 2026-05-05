'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

import { AuthPrimaryButton } from './auth-primary-button'
import { AuthTextField } from './auth-text-field'
import { mapAuthError } from '@/lib/auth/map-auth-error'
import { safeReturnPath } from '@/lib/auth-redirect'
import { createClient } from '@/lib/supabase/client'
import { isValidEmail } from '@/lib/validation/email'

type LoginFormProps = {
  redirectTo?: string | null
}

export function LoginForm({ redirectTo }: LoginFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const authLinkFailed = searchParams.get('error') === 'auth'
  const sessionRecovery = searchParams.get('error') === 'session'
  const passwordJustReset = searchParams.get('reset') === 'success'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setEmailError(null)
    setPasswordError(null)

    const emailTrimmed = email.trim().toLowerCase()
    if (!isValidEmail(emailTrimmed)) {
      setEmailError('Enter a valid email address.')
      return
    }
    if (!password) {
      setPasswordError('Enter your password.')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { error: signError } = await supabase.auth.signInWithPassword({
        email: emailTrimmed,
        password,
      })
      if (signError) {
        setError(mapAuthError(signError).message)
        return
      }
      router.push(safeReturnPath(redirectTo))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="gap-block flex flex-col" noValidate>
      {passwordJustReset ? (
        <p
          className="bg-muted text-foreground rounded-lg border border-emerald-500/25 px-3 py-2 text-sm leading-relaxed"
          role="status"
        >
          Password updated. Sign in below with your new password.
        </p>
      ) : null}
      {sessionRecovery ? (
        <div
          className="bg-muted text-foreground space-y-inset rounded-lg border border-amber-500/30 px-3 py-3 text-sm leading-relaxed"
          role="alert"
        >
          <p className="text-foreground font-medium">Your saved session could not be restored.</p>
          <p className="text-muted-foreground">
            This often happens after a deploy, project switch, or expired refresh token. Sign in
            again. If it keeps failing, check the browser Network tab (auth request) and cookies for
            this site, and confirm production uses the same Supabase project as your user account.
          </p>
        </div>
      ) : null}
      {authLinkFailed ? (
        <div
          className="bg-muted text-foreground space-y-inset rounded-lg border border-amber-500/30 px-3 py-3 text-sm leading-relaxed"
          role="alert"
        >
          <p className="text-foreground font-medium">
            This sign-in link did not work or has expired.
          </p>
          <p className="text-muted-foreground">
            Use <span className="text-foreground font-medium">Forgot password?</span> below to get
            an email and set a new password. After you save it, you&apos;ll return here to sign in.
          </p>
          <Link
            href="/auth/forgot-password"
            className="text-primary inline-flex font-medium underline-offset-4 hover:underline"
          >
            Open reset password →
          </Link>
        </div>
      ) : null}
      <AuthTextField
        label="Email"
        labelId="login-email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value)
          setEmailError(null)
        }}
        error={emailError}
        errorId="login-email-error"
      />
      <AuthTextField
        label="Password"
        labelId="login-password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value)
          setPasswordError(null)
        }}
        error={passwordError}
        errorId="login-password-error"
        labelAccessory={
          <Link
            href="/auth/forgot-password"
            className="text-muted-foreground text-xs font-medium hover:underline"
          >
            Forgot password?
          </Link>
        }
      />
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      <AuthPrimaryButton type="submit" disabled={loading}>
        {loading ? 'Signing in…' : 'Sign in'}
      </AuthPrimaryButton>
      <p className="text-muted-foreground pt-inset text-center text-sm leading-relaxed">
        Access is by invitation. Your admin invites teammates by email.
      </p>
    </form>
  )
}
