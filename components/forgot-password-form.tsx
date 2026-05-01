'use client'

import { useState } from 'react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { mapAuthError } from '@/lib/auth/map-auth-error'
import { createClient } from '@/lib/supabase/client'
import { isValidEmail } from '@/lib/validation/email'
import { getSiteOrigin } from '@/lib/site-url'

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setEmailError(null)
    if (!isValidEmail(email)) {
      setEmailError('Enter a valid email address.')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const redirectTo = `${getSiteOrigin()}/auth/callback?next=${encodeURIComponent('/auth/update-password')}`
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      {
        redirectTo,
      }
    )
    setLoading(false)
    if (resetErr) {
      setError(mapAuthError(resetErr).message)
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <p className="text-foreground text-sm leading-relaxed" role="status">
        If an account exists for that email, we sent a reset link. Check your inbox and spam folder.
      </p>
    )
  }

  return (
    <form onSubmit={onSubmit} className="gap-block flex flex-col" noValidate>
      <div className="space-y-inset">
        <Label htmlFor="forgot-email">Email</Label>
        <Input
          id="forgot-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            setEmailError(null)
          }}
          aria-invalid={emailError ? true : undefined}
          aria-describedby={emailError ? 'forgot-email-error' : undefined}
        />
        {emailError ? (
          <p id="forgot-email-error" className="text-destructive text-sm" role="alert">
            {emailError}
          </p>
        ) : null}
      </div>
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" variant="cta" disabled={loading}>
        {loading ? 'Sending…' : 'Send reset link'}
      </Button>
      <div className="border-border mt-layout pt-layout border-t">
        <Link
          href="/auth/login"
          className="text-muted-foreground text-sm font-medium hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    </form>
  )
}
