'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Mail, UserMinus, UserPlus } from 'lucide-react'

import { resendTeamInvite } from '@/lib/auth/invite-actions'
import {
  activateTeamMember,
  disableTeamMemberAfterConfirmation,
  previewDisableUser,
  setClientAccountManager,
} from '@/lib/auth/user-admin-actions'
import type { OrgUserRowJson } from '@/lib/org-users/types'
import {
  orgUserCanResendInvite,
  orgUserResendInviteEmail,
} from '@/lib/org-users/admin-resend-invite'
import { formatRelativeLastActive } from '@/lib/format-relative-auth'
import { cn } from '@/lib/utils'
import { EditUserSheet } from '@/components/settings/edit-user-sheet'
import { ROLE_LABEL, RoleBadge } from '@/components/settings/role-badge'
import {
  AdminUserActivateDialog,
  AdminUserDisableDialog,
  AdminUserResendInviteDialog,
  adminUserDisplayName,
  type AdminDisableDialogState,
} from '@/components/settings/user-admin-dialogs'
import { StatusBadge } from '@/components/settings/status-badge'
import { UserAvatar } from '@/components/settings/user-avatar'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FilterSelect } from '@/components/ui/filter-bar'
import { FormControlInput, FormControlTextarea } from '@/components/ui/form-control'
import { Label } from '@/components/ui/label'

function isUserBanned(row: OrgUserRowJson): boolean {
  if (!row.banned_until) return false
  return new Date(row.banned_until) > new Date()
}

function rowStatus(row: OrgUserRowJson): 'active' | 'invited' | 'disabled' {
  if (isUserBanned(row)) return 'disabled'
  if (row.require_password_change) return 'invited'
  return 'active'
}

type ManagerOptionRow = { id: string; full_name: string | null; email: string | null }

function AccountManagerCard({
  clientId,
  initialManagerId,
  managers,
}: {
  clientId: string
  initialManagerId: string | null
  managers: ManagerOptionRow[]
}) {
  const router = useRouter()
  const [managerId, setManagerId] = useState(initialManagerId ?? '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  return (
    <Card className="border-border/60 shadow-soft ring-border/60 gap-0 rounded-2xl py-0 ring-1">
      <CardHeader className="border-border/60 gap-inset px-section pb-block pt-section border-b">
        <CardTitle className="font-display text-lg font-semibold">Account manager</CardTitle>
        <CardDescription>
          Assigned manager for this client. Used for the automatic Sales chat after first sign-in.
        </CardDescription>
      </CardHeader>
      <CardContent className="gap-block px-section py-section flex flex-col">
        <FilterSelect
          className="max-w-md"
          value={managerId}
          onChange={(e) => setManagerId(e.target.value)}
          disabled={busy}
        >
          <option value="">None</option>
          {managers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.full_name?.trim() || m.email || m.id.slice(0, 8)}
            </option>
          ))}
        </FilterSelect>
        {err ? (
          <p className="text-destructive text-sm" role="alert">
            {err}
          </p>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="cta"
          disabled={busy || (managerId || null) === (initialManagerId ?? null)}
          onClick={() => {
            setErr(null)
            setBusy(true)
            void (async () => {
              const res = await setClientAccountManager({
                clientUserId: clientId,
                managerId: managerId || null,
              })
              setBusy(false)
              if (!res.ok) {
                setErr(res.message)
                return
              }
              router.refresh()
            })()
          }}
        >
          {busy ? 'Saving…' : 'Save manager'}
        </Button>
      </CardContent>
    </Card>
  )
}

export function UserDetailClient({
  row,
  currentUserId,
  copywriterCandidates,
  counts,
  managerOptions = [],
}: {
  row: OrgUserRowJson
  currentUserId: string
  copywriterCandidates: OrgUserRowJson[]
  counts: {
    clientActiveOrders: number
    copywriterActiveOrders: number
    sourcerSitesCount: number
  }
  managerOptions?: ManagerOptionRow[]
}) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formMessage, setFormMessage] = useState<string | null>(null)
  const [rowBusy, setRowBusy] = useState(false)

  const [disableDialog, setDisableDialog] = useState<AdminDisableDialogState>(null)
  const [disableBusy, setDisableBusy] = useState(false)
  const [activateOpen, setActivateOpen] = useState(false)
  const [activateBusy, setActivateBusy] = useState(false)
  const [resendOpen, setResendOpen] = useState(false)
  const [resendBusy, setResendBusy] = useState(false)

  const st = rowStatus(row)
  const email = row.email ?? ''
  const resendEmail = orgUserResendInviteEmail(row)
  const name = adminUserDisplayName(row)
  const memberSince = row.created_at
    ? new Date(row.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })
    : '—'

  const copywriterReplacementOptions = useMemo(() => {
    const rowId = disableDialog?.row.id ?? row.id
    return copywriterCandidates.filter((r) => r.id !== rowId)
  }, [copywriterCandidates, disableDialog?.row.id, row.id])

  const canResend = orgUserCanResendInvite(row)

  const canToggleAccess = row.id !== currentUserId && row.role !== 'admin'

  async function beginDisable() {
    setFormError(null)
    setFormMessage(null)
    setRowBusy(true)
    const preview = await previewDisableUser(row.id)
    setRowBusy(false)

    if (!preview.ok) {
      setFormError(preview.message)
      return
    }

    if (preview.flow === 'reassign_copywriter') {
      const replacements = copywriterCandidates.filter((r) => r.id !== row.id)
      setDisableDialog({
        row,
        mode: 'reassign',
        activeOrders: preview.copywriterActiveOrders,
        replacementId: replacements[0]?.id ?? '',
      })
      return
    }

    if (preview.flow === 'sourcer_cleanup') {
      setDisableDialog({
        row,
        mode: 'sourcer',
        sitesAssigned: preview.sourcerSitesCount,
      })
      return
    }

    setDisableDialog({ row, mode: 'simple' })
  }

  async function confirmDisable() {
    if (!disableDialog) return
    const reassignCopywriterTo =
      disableDialog.mode === 'reassign' ? disableDialog.replacementId || undefined : undefined

    if (
      disableDialog.mode === 'reassign' &&
      (!reassignCopywriterTo || reassignCopywriterTo === row.id)
    ) {
      setFormError('Choose another copywriter to receive active orders.')
      return
    }

    setDisableBusy(true)
    setFormError(null)
    const res = await disableTeamMemberAfterConfirmation({
      targetUserId: row.id,
      reassignCopywriterTo,
    })
    setDisableBusy(false)

    if (!res.ok) {
      setFormError(res.message)
      return
    }

    setDisableDialog(null)
    router.refresh()
  }

  async function confirmActivate() {
    setActivateBusy(true)
    setFormError(null)
    const res = await activateTeamMember(row.id)
    setActivateBusy(false)
    if (!res.ok) {
      setFormError(res.message)
      setActivateOpen(false)
      return
    }
    setActivateOpen(false)
    router.refresh()
  }

  async function confirmResend() {
    if (!resendEmail) return
    setResendBusy(true)
    setFormError(null)
    try {
      const res = await resendTeamInvite({ email: resendEmail })
      if (!res.ok) {
        setFormError(res.message)
        setResendOpen(false)
        return
      }
      setFormMessage(res.message ?? 'Invitation resent.')
      setResendOpen(false)
      router.refresh()
    } catch (err) {
      console.error('[confirmResend]', err)
      setFormError(
        err instanceof Error && /failed to fetch/i.test(err.message)
          ? 'Could not reach the server. Try again.'
          : 'Something went wrong. Try again.'
      )
      setResendOpen(false)
    } finally {
      setResendBusy(false)
    }
  }

  return (
    <div className="gap-layout flex flex-col">
      <Link
        href="/settings/users"
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'sm' }),
          'text-muted-foreground hover:text-foreground gap-inset w-fit px-0'
        )}
      >
        <ArrowLeft className="size-4" aria-hidden />
        All users
      </Link>

      <section className="border-border/60 bg-card shadow-soft overflow-hidden rounded-2xl border">
        <div className="gap-block border-border/60 px-section py-block flex flex-col border-b sm:flex-row sm:items-start sm:justify-between">
          <div className="gap-block flex min-w-0 items-start">
            <UserAvatar
              fullName={row.full_name}
              email={email || name}
              className="size-14 text-sm"
            />
            <div className="space-y-inset min-w-0">
              <div className="gap-inset flex flex-wrap items-center">
                <h1 className="font-display text-foreground text-xl font-semibold tracking-tight">
                  {name}
                </h1>
                <RoleBadge role={row.role} />
                <StatusBadge status={st} />
              </div>
              <p className="text-muted-foreground text-sm">{email || '—'}</p>
              <p className="text-muted-foreground text-xs tabular-nums">
                Last active {formatRelativeLastActive(row.last_sign_in_at)}
              </p>
            </div>
          </div>
          <div className="gap-inset flex shrink-0 flex-wrap">
            <Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              Edit profile
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canResend || rowBusy}
              onClick={() => setResendOpen(true)}
            >
              <Mail className="size-4" aria-hidden />
              Resend invite
            </Button>
            {isUserBanned(row) ? (
              <Button
                type="button"
                variant="cta"
                size="sm"
                disabled={!canToggleAccess || activateBusy || rowBusy}
                onClick={() => setActivateOpen(true)}
              >
                <UserPlus className="size-4" aria-hidden />
                Activate
              </Button>
            ) : (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={!canToggleAccess || rowBusy}
                onClick={() => void beginDisable()}
              >
                <UserMinus className="size-4" aria-hidden />
                Disable
              </Button>
            )}
          </div>
        </div>

        <div className="gap-block px-section py-block grid sm:grid-cols-3">
          <div className="border-border/60 bg-muted/20 p-block rounded-xl border">
            <p className="text-muted-foreground text-xs font-medium">Active orders (as client)</p>
            <p className="font-display text-foreground mt-inset text-2xl font-semibold tabular-nums">
              {counts.clientActiveOrders}
            </p>
          </div>
          <div className="border-border/60 bg-muted/20 p-block rounded-xl border">
            <p className="text-muted-foreground text-xs font-medium">
              Active orders (as copywriter)
            </p>
            <p className="font-display text-foreground mt-inset text-2xl font-semibold tabular-nums">
              {counts.copywriterActiveOrders}
            </p>
          </div>
          <div className="border-border/60 bg-muted/20 p-block rounded-xl border">
            <p className="text-muted-foreground text-xs font-medium">Sites assigned (as sourcer)</p>
            <p className="font-display text-foreground mt-inset text-2xl font-semibold tabular-nums">
              {counts.sourcerSitesCount}
            </p>
          </div>
        </div>
      </section>

      <Card className="border-border/60 shadow-soft ring-border/60 gap-0 rounded-2xl py-0 ring-1">
        <CardHeader className="border-border/60 gap-inset px-section pb-block pt-section border-b">
          <CardTitle className="font-display text-lg font-semibold">Profile</CardTitle>
          <CardDescription>
            Values from this user&apos;s{' '}
            <code className="text-foreground bg-muted rounded px-1 py-0.5 text-xs">profiles</code>{' '}
            row. Email prefers the DB mirror, then Auth.
          </CardDescription>
        </CardHeader>
        <CardContent className="gap-section px-section py-section flex min-w-0 flex-col">
          <div className="gap-inset grid sm:grid-cols-2">
            <div className="gap-inset flex min-w-0 flex-col">
              <Label htmlFor="detail-profile-email" className="text-foreground text-sm font-medium">
                Email
              </Label>
              <FormControlInput id="detail-profile-email" readOnly value={email} placeholder="—" />
            </div>
            <div className="gap-inset flex min-w-0 flex-col">
              <Label htmlFor="detail-profile-role" className="text-foreground text-sm font-medium">
                Role
              </Label>
              <FormControlInput id="detail-profile-role" readOnly value={ROLE_LABEL[row.role]} />
            </div>
          </div>
          <div className="gap-inset grid sm:grid-cols-2">
            <div className="gap-inset flex min-w-0 flex-col">
              <Label
                htmlFor="detail-profile-company"
                className="text-foreground text-sm font-medium"
              >
                Company
              </Label>
              <FormControlInput
                id="detail-profile-company"
                readOnly
                value={row.company_name ?? ''}
                placeholder="—"
              />
            </div>
            <div className="gap-inset flex min-w-0 flex-col">
              <Label htmlFor="detail-profile-phone" className="text-foreground text-sm font-medium">
                Phone
              </Label>
              <FormControlInput
                id="detail-profile-phone"
                readOnly
                value={row.phone ?? ''}
                placeholder="—"
              />
            </div>
          </div>
          <div className="gap-inset flex min-w-0 flex-col">
            <Label htmlFor="detail-profile-since" className="text-foreground text-sm font-medium">
              Member since
            </Label>
            <FormControlInput id="detail-profile-since" readOnly value={memberSince} />
          </div>
          <div className="gap-inset flex min-w-0 flex-col">
            <Label htmlFor="detail-profile-bio" className="text-foreground text-sm font-medium">
              Bio
            </Label>
            <FormControlTextarea
              id="detail-profile-bio"
              readOnly
              value={row.bio ?? ''}
              placeholder="—"
              rows={4}
              className="cursor-default"
            />
          </div>
        </CardContent>
      </Card>

      {row.role === 'client' ? (
        <AccountManagerCard
          key={`${row.id}-${row.account_manager_id ?? 'none'}`}
          clientId={row.id}
          initialManagerId={row.account_manager_id}
          managers={managerOptions}
        />
      ) : null}

      {formMessage ? (
        <p className="text-foreground text-sm" role="status">
          {formMessage}
        </p>
      ) : null}
      {formError ? (
        <p className="text-destructive text-sm" role="alert">
          {formError}
        </p>
      ) : null}

      <EditUserSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        target={row}
        onSaved={() => router.refresh()}
      />

      <AdminUserDisableDialog
        state={disableDialog}
        busy={disableBusy}
        copywriterReplacementOptions={copywriterReplacementOptions}
        onOpenChange={(open) => {
          if (!open) setDisableDialog(null)
        }}
        onReplacementChange={(replacementId) =>
          setDisableDialog((prev) =>
            prev?.mode === 'reassign' ? { ...prev, replacementId } : prev
          )
        }
        onConfirm={() => void confirmDisable()}
      />

      <AdminUserActivateDialog
        open={activateOpen}
        busy={activateBusy}
        displayName={name}
        onOpenChange={setActivateOpen}
        onConfirm={() => void confirmActivate()}
      />

      <AdminUserResendInviteDialog
        open={resendOpen}
        busy={resendBusy}
        email={resendEmail || email}
        onOpenChange={setResendOpen}
        onConfirm={() => void confirmResend()}
      />
    </div>
  )
}
