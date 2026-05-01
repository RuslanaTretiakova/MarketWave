'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

    if (!isValidEmail(email)) {
      setEmailError('Enter a valid email address.')
      return
    }
    if (!password) {
      setPasswordError('Enter your password.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: signError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })
    setLoading(false)
    if (signError) {
      setError(mapAuthError(signError).message)
      return
    }
    router.refresh()
    router.push(safeReturnPath(redirectTo))
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
      <div className="space-y-inset">
        <Label htmlFor="login-email">Email</Label>
        <Input
          id="login-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            setEmailError(null)
          }}
          aria-invalid={emailError ? true : undefined}
          aria-describedby={emailError ? 'login-email-error' : undefined}
        />
        {emailError ? (
          <p id="login-email-error" className="text-destructive text-sm" role="alert">
            {emailError}
          </p>
        ) : null}
      </div>
      <div className="space-y-inset">
        <div className="gap-inset flex items-center justify-between">
          <Label htmlFor="login-password">Password</Label>
          <Link
            href="/auth/forgot-password"
            className="text-muted-foreground text-xs font-medium hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value)
            setPasswordError(null)
          }}
          aria-invalid={passwordError ? true : undefined}
          aria-describedby={passwordError ? 'login-password-error' : undefined}
        />
        {passwordError ? (
          <p id="login-password-error" className="text-destructive text-sm" role="alert">
            {passwordError}
          </p>
        ) : null}
      </div>
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" variant="cta" disabled={loading}>
        {loading ? 'Signing in…' : 'Sign in'}
      </Button>
      <p className="text-muted-foreground text-center text-sm leading-relaxed">
        Access is by invitation. Your admin invites teammates by email.
      </p>
    </form>
  )
}
