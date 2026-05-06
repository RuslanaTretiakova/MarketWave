'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { PasswordRequirementsHint } from '@/components/auth/password-requirements-hint'
import { mapAuthError } from '@/lib/auth/map-auth-error'
import { AUTH_MIN_PASSWORD_LENGTH } from '@/lib/auth/password-min'
import { confirmMatches, meetsMinLength, trimPasswordInput } from '@/lib/auth/password-validation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { isValidEmail, normalizeEmail } from '@/lib/validation/email'
import { SETTINGS_RIGHT_SHEET_CONTENT_CLASS } from '@/components/settings/settings-right-sheet'
import { Button } from '@/components/ui/button'
import { FormControlInput } from '@/components/ui/form-control'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

export function ChangeCredentialsSheet({
  open,
  onOpenChange,
  sessionEmail,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  sessionEmail: string
}) {
  const router = useRouter()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(SETTINGS_RIGHT_SHEET_CONTENT_CLASS)}
        showCloseButton={true}
      >
        <SheetHeader>
          <SheetTitle>Change credentials</SheetTitle>
          <SheetDescription>
            Confirm your current password, then set a new email and/or password. Email changes may
            require verification depending on your project settings.
          </SheetDescription>
        </SheetHeader>
        {open ? (
          <ChangeCredentialsForm
            key={sessionEmail}
            sessionEmail={sessionEmail}
            onClose={() => onOpenChange(false)}
            onSaved={() => {
              onOpenChange(false)
              router.refresh()
            }}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function ChangeCredentialsForm({
  sessionEmail,
  onClose,
  onSaved,
}: {
  sessionEmail: string
  onClose: () => void
  onSaved: () => void
}) {
  const [email, setEmail] = useState(sessionEmail)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const trimmedEmail = email.trim()
    if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
      setError('Enter a valid email address.')
      return
    }
    if (!currentPassword) {
      setError('Current password is required.')
      return
    }

    const trimmedNew = trimPasswordInput(newPassword)
    const trimmedConfirm = trimPasswordInput(confirmPassword)
    if (!meetsMinLength(trimmedNew)) {
      setError(`New password must be at least ${AUTH_MIN_PASSWORD_LENGTH} characters.`)
      return
    }
    if (!confirmMatches(trimmedNew, trimmedConfirm)) {
      setError('New password and confirmation do not match.')
      return
    }

    setBusy(true)
    const supabase = createClient()

    const { error: signErr } = await supabase.auth.signInWithPassword({
      email: sessionEmail,
      password: currentPassword,
    })

    if (signErr) {
      setError(mapAuthError(signErr).message)
      setBusy(false)
      return
    }

    const nextEmail = normalizeEmail(trimmedEmail)
    const payload: { email?: string; password: string } = { password: trimmedNew }
    if (nextEmail !== normalizeEmail(sessionEmail)) {
      payload.email = nextEmail
    }

    const { error: updErr } = await supabase.auth.updateUser(payload)

    if (updErr) {
      setError(mapAuthError(updErr).message)
      setBusy(false)
      return
    }

    setBusy(false)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    toast.success('Information updated')
    onSaved()
  }

  return (
    <form onSubmit={onSubmit} className="gap-block flex flex-col px-4 pb-4">
      <div className="gap-inset flex flex-col">
        <Label htmlFor="cred-email" className="text-foreground text-sm font-medium">
          Email
        </Label>
        <FormControlInput
          id="cred-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="gap-inset flex flex-col">
        <Label htmlFor="cred-current" className="text-foreground text-sm font-medium">
          Current password
        </Label>
        <FormControlInput
          id="cred-current"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />
      </div>
      <div className="gap-inset flex flex-col">
        <Label htmlFor="cred-new" className="text-foreground text-sm font-medium">
          New password
        </Label>
        <FormControlInput
          id="cred-new"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={AUTH_MIN_PASSWORD_LENGTH}
        />
      </div>
      <div className="gap-inset flex flex-col">
        <Label htmlFor="cred-confirm" className="text-foreground text-sm font-medium">
          Confirm new password
        </Label>
        <FormControlInput
          id="cred-confirm"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={AUTH_MIN_PASSWORD_LENGTH}
        />
      </div>

      <PasswordRequirementsHint password={newPassword} confirm={confirmPassword} />

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <SheetFooter className="gap-block pt-block px-0 sm:flex-row">
        <Button type="button" variant="outline" disabled={busy} onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" variant="cta" disabled={busy}>
          {busy ? 'Saving…' : 'Save'}
        </Button>
      </SheetFooter>
    </form>
  )
}
