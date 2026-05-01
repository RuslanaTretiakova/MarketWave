'use client'

import { useMemo, useState } from 'react'

import { inviteTeamMember, resendTeamInvite } from '@/lib/auth/invite-actions'
import type { Database } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { isValidEmail, normalizeEmail } from '@/lib/validation/email'

type InviteRole = Exclude<Database['public']['Enums']['user_role'], 'admin'>

const ROLE_OPTIONS: { value: InviteRole; label: string }[] = [
  { value: 'client', label: 'Client' },
  { value: 'manager', label: 'Manager' },
  { value: 'sourcer', label: 'Sourcer' },
  { value: 'copywriter', label: 'Copywriter' },
]

type AuditRow = {
  id: string
  action: string
  target_email: string | null
  created_at: string
}

type InviteTeamCardProps = {
  initialAudit: AuditRow[]
}

export function InviteTeamCard({ initialAudit }: InviteTeamCardProps) {
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<InviteRole>('client')
  const [resendEmail, setResendEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadingInvite, setLoadingInvite] = useState(false)
  const [loadingResend, setLoadingResend] = useState(false)
  const [audit, setAudit] = useState(initialAudit)

  const sortedAudit = useMemo(
    () => [...audit].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)),
    [audit]
  )

  async function onInvite(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    if (!isValidEmail(email)) {
      setError('Enter a valid email address.')
      return
    }
    setLoadingInvite(true)
    const res = await inviteTeamMember({
      email: normalizeEmail(email),
      role,
      fullName: fullName.trim() || undefined,
    })
    setLoadingInvite(false)
    if (!res.ok) {
      setError(res.message)
      return
    }
    setMessage(res.message ?? 'Invitation sent.')
    setAudit((prev) => [
      {
        id: crypto.randomUUID(),
        action: 'invite',
        target_email: normalizeEmail(email),
        created_at: new Date().toISOString(),
      },
      ...prev,
    ])
    setEmail('')
    setFullName('')
  }

  async function onResend(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    if (!isValidEmail(resendEmail)) {
      setError('Enter a valid email for resend.')
      return
    }
    setLoadingResend(true)
    const res = await resendTeamInvite({ email: normalizeEmail(resendEmail) })
    setLoadingResend(false)
    if (!res.ok) {
      setError(res.message)
      return
    }
    setMessage(res.message ?? 'Invitation resent.')
    setAudit((prev) => [
      {
        id: crypto.randomUUID(),
        action: 'resend_invite',
        target_email: normalizeEmail(resendEmail),
        created_at: new Date().toISOString(),
      },
      ...prev,
    ])
  }

  return (
    <div className="gap-layout flex flex-col">
      <form onSubmit={onInvite} className="gap-block flex max-w-xl flex-col" noValidate>
        <h3 className="text-foreground text-base font-semibold">Invite teammate</h3>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Sends a Supabase invitation email. New users set a password on first sign-in.
        </p>
        <div className="gap-inset grid sm:grid-cols-2">
          <div className="space-y-inset sm:col-span-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-inset">
            <Label htmlFor="invite-name">Full name (optional)</Label>
            <Input
              id="invite-name"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="space-y-inset">
            <Label htmlFor="invite-role">Role</Label>
            <select
              id="invite-role"
              className="border-input bg-background ring-offset-background focus-visible:ring-ring h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              value={role}
              onChange={(e) => setRole(e.target.value as InviteRole)}
            >
              {ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Button type="submit" variant="cta" disabled={loadingInvite} className="w-fit">
          {loadingInvite ? 'Sending…' : 'Send invitation'}
        </Button>
      </form>

      <form
        onSubmit={onResend}
        className="border-border gap-block mt-layout pt-layout flex max-w-xl flex-col border-t"
      >
        <h3 className="text-foreground text-base font-semibold">Resend invitation</h3>
        <p className="text-muted-foreground text-sm leading-relaxed">
          If someone did not receive their invite and has never signed in, resend it here.
        </p>
        <div className="space-y-inset max-w-md">
          <Label htmlFor="resend-email">Email</Label>
          <Input
            id="resend-email"
            type="email"
            value={resendEmail}
            onChange={(e) => setResendEmail(e.target.value)}
          />
        </div>
        <Button type="submit" variant="outline" disabled={loadingResend} className="w-fit">
          {loadingResend ? 'Sending…' : 'Resend invitation'}
        </Button>
      </form>

      {message ? (
        <p className="text-foreground text-sm" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      {sortedAudit.length > 0 ? (
        <div className="mt-layout">
          <h4 className="text-foreground mb-inset text-sm font-semibold">Recent invite activity</h4>
          <ul className="text-muted-foreground divide-border max-w-2xl divide-y text-sm">
            {sortedAudit.slice(0, 15).map((row) => (
              <li key={row.id} className="py-inset gap-inset flex flex-wrap justify-between">
                <span>{row.target_email ?? '—'}</span>
                <span className="text-foreground/80">
                  {row.action} · {new Date(row.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
