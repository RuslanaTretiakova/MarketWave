'use client'

import { useState } from 'react'

import { AuthPrimaryButton } from './auth-primary-button'
import { AuthTextField } from './auth-text-field'
import { requestPasswordResetAction } from '@/lib/auth/password-reset-actions'
import { isValidEmail } from '@/lib/validation/email'

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [sentTo, setSentTo] = useState<string>('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setEmailError(null)
    const emailTrimmed = email.trim().toLowerCase()
    if (!isValidEmail(emailTrimmed)) {
      setEmailError('Enter a valid email address.')
      return
    }
    setLoading(true)
    const result = await requestPasswordResetAction(emailTrimmed)
    setLoading(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    setSentTo(emailTrimmed)
    setSent(true)
  }

  if (sent) {
    return (
      <p className="text-foreground text-sm leading-relaxed" role="status">
        If an account exists for <span className="font-medium">{sentTo}</span>, you will receive an
        email with a reset link. Check your inbox and spam folder. The link expires after a short
        time.
      </p>
    )
  }

  return (
    <form onSubmit={onSubmit} className="gap-block flex flex-col" noValidate>
      <AuthTextField
        label="Email"
        labelId="forgot-email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value)
          setEmailError(null)
        }}
        error={emailError}
        errorId="forgot-email-error"
      />
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      <AuthPrimaryButton type="submit" disabled={loading}>
        {loading ? 'Sending…' : 'Send reset link'}
      </AuthPrimaryButton>
    </form>
  )
}
