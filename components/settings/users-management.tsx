'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Filter,
  Mail,
  MoreHorizontal,
  Plus,
  Search,
  UserCog,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'

import { inviteTeamMember, resendTeamInvite } from '@/lib/auth/invite-actions'
import {
  activateTeamMember,
  disableTeamMemberAfterConfirmation,
  previewDisableUser,
} from '@/lib/auth/user-admin-actions'
import {
  orgUserCanResendInvite,
  orgUserResendInviteEmail,
} from '@/lib/org-users/admin-resend-invite'
import type { OrgInviteRole } from '@/lib/org-users/org-invite-roles'
import type { OrgUserRole, OrgUserRowJson } from '@/lib/org-users/types'
import { formatRelativeLastActive } from '@/lib/format-relative-auth'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { isValidEmail, normalizeEmail } from '@/lib/validation/email'
import { cn } from '@/lib/utils'

import { EditUserSheet } from '@/components/settings/edit-user-sheet'
import { ROLE_LABEL, RoleBadge } from '@/components/settings/role-badge'
import { SettingsRoleSelect } from '@/components/settings/settings-role-select'
import { StatusBadge } from '@/components/settings/status-badge'
import {
  AdminUserActivateDialog,
  AdminUserDisableDialog,
  AdminUserResendInviteDialog,
  adminUserDisplayName,
  type AdminDisableDialogState,
} from '@/components/settings/user-admin-dialogs'
import { UserAvatar } from '@/components/settings/user-avatar'

type RoleFilter = 'all' | OrgUserRole
type StatusFilter = 'all' | 'active' | 'invited' | 'disabled'

function isUserBanned(row: OrgUserRowJson): boolean {
  if (!row.banned_until) return false
  return new Date(row.banned_until) > new Date()
}

function rowStatus(row: OrgUserRowJson): 'active' | 'invited' | 'disabled' {
  if (isUserBanned(row)) return 'disabled'
  if (row.require_password_change) return 'invited'
  return 'active'
}

function chipClasses(active: boolean) {
  return cn(
    'rounded-full border px-2.5 py-1 text-xs capitalize transition-colors',
    active
      ? 'border-primary bg-primary-soft text-primary-ink'
      : 'border-border/60 bg-background hover:bg-muted'
  )
}

/** Named group so nested controls (links, menus) never steal `group-hover` from the row. */
const USER_ROW_CELL =
  'px-4 py-3 align-middle whitespace-normal transition-colors group-hover/user-row:bg-muted/50 group-has-[[aria-expanded=true]]/user-row:bg-muted/50'

const USER_ROW_CELL_MUTED =
  'text-muted-foreground px-4 py-3 align-middle tabular-nums whitespace-normal transition-colors group-hover/user-row:bg-muted/50 group-has-[[aria-expanded=true]]/user-row:bg-muted/50'

const USER_ROW_CELL_ACTIONS =
  'px-4 py-3 align-middle text-right whitespace-normal transition-colors group-hover/user-row:bg-muted/50 group-has-[[aria-expanded=true]]/user-row:bg-muted/50'

export function UsersManagement({
  initialRows,
  currentUserId,
}: {
  initialRows: OrgUserRowJson[]
  currentUserId: string
}) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState<OrgInviteRole>('client')
  const [inviteBusy, setInviteBusy] = useState(false)

  const [editOpen, setEditOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<OrgUserRowJson | null>(null)

  const [formMessage, setFormMessage] = useState<string | null>(null)

  const [rowBusyId, setRowBusyId] = useState<string | null>(null)

  const [disableDialog, setDisableDialog] = useState<AdminDisableDialogState>(null)
  const [disableBusy, setDisableBusy] = useState(false)

  const [activateTarget, setActivateTarget] = useState<OrgUserRowJson | null>(null)
  const [activateBusy, setActivateBusy] = useState(false)

  const [resendTargetEmail, setResendTargetEmail] = useState<string | null>(null)
  const [resendBusy, setResendBusy] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return initialRows.filter((row) => {
      if (roleFilter !== 'all' && row.role !== roleFilter) return false
      const st = rowStatus(row)
      if (statusFilter !== 'all' && st !== statusFilter) return false
      if (!q) return true
      const name = adminUserDisplayName(row).toLowerCase()
      const email = (row.email ?? '').toLowerCase()
      return name.includes(q) || email.includes(q)
    })
  }, [initialRows, query, roleFilter, statusFilter])

  const copywriterReplacementOptions = useMemo(() => {
    const rowId = disableDialog?.row.id
    return initialRows.filter((r) => r.role === 'copywriter' && r.id !== rowId && !isUserBanned(r))
  }, [initialRows, disableDialog?.row.id])

  async function onInviteSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormMessage(null)
    if (!isValidEmail(inviteEmail)) {
      toast.error('Enter a valid email address.')
      return
    }
    setInviteBusy(true)
    try {
      const res = await inviteTeamMember({
        email: normalizeEmail(inviteEmail),
        role: inviteRole,
        fullName: inviteName.trim() || undefined,
      })
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      setFormMessage(res.message ?? 'Invitation sent.')
      setInviteEmail('')
      setInviteName('')
      setInviteOpen(false)
      router.refresh()
    } catch (err) {
      console.error('[onInviteSubmit]', err)
      const msg =
        err instanceof Error && /failed to fetch/i.test(err.message)
          ? 'Could not reach the server. Check your connection and try again.'
          : 'Something went wrong. Try again.'
      toast.error(msg)
    } finally {
      setInviteBusy(false)
    }
  }

  function openEdit(row: OrgUserRowJson) {
    setFormMessage(null)
    setEditTarget(row)
    setEditOpen(true)
  }

  async function onResendConfirmed() {
    const email = resendTargetEmail
    if (!email) return
    setFormMessage(null)
    setResendBusy(true)
    try {
      const res = await resendTeamInvite({ email })
      if (!res.ok) {
        toast.error(res.message)
        setResendTargetEmail(null)
        return
      }
      setFormMessage(res.message ?? 'Invitation resent.')
      setResendTargetEmail(null)
      router.refresh()
    } catch (err) {
      console.error('[onResendConfirmed]', err)
      const msg =
        err instanceof Error && /failed to fetch/i.test(err.message)
          ? 'Could not reach the server. Check your connection and try again.'
          : 'Something went wrong. Try again.'
      toast.error(msg)
      setResendTargetEmail(null)
    } finally {
      setResendBusy(false)
    }
  }

  async function beginDisable(row: OrgUserRowJson) {
    setFormMessage(null)
    setRowBusyId(row.id)
    const preview = await previewDisableUser(row.id)
    setRowBusyId(null)

    if (!preview.ok) {
      toast.error(preview.message)
      return
    }

    if (preview.flow === 'reassign_copywriter') {
      const replacements = initialRows.filter(
        (r) => r.role === 'copywriter' && r.id !== row.id && !isUserBanned(r)
      )
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
    const { row } = disableDialog
    const reassignCopywriterTo =
      disableDialog.mode === 'reassign' ? disableDialog.replacementId || undefined : undefined

    if (
      disableDialog.mode === 'reassign' &&
      (!reassignCopywriterTo || reassignCopywriterTo === row.id)
    ) {
      toast.error('Choose another copywriter to receive active orders.')
      return
    }

    setDisableBusy(true)
    const res = await disableTeamMemberAfterConfirmation({
      targetUserId: row.id,
      reassignCopywriterTo,
    })
    setDisableBusy(false)

    if (!res.ok) {
      toast.error(res.message)
      return
    }

    setDisableDialog(null)
    router.refresh()
  }

  async function confirmActivate() {
    if (!activateTarget) return
    setActivateBusy(true)
    const res = await activateTeamMember(activateTarget.id)
    setActivateBusy(false)
    if (!res.ok) {
      toast.error(res.message)
      setActivateTarget(null)
      return
    }
    setActivateTarget(null)
    router.refresh()
  }

  function navigateToUser(e: React.MouseEvent, userId: string) {
    const el = e.target as HTMLElement
    if (el.closest('[data-row-actions]')) return
    router.push(`/settings/users/${userId}`)
  }

  const roleFilters: { key: RoleFilter; label: string }[] = [
    { key: 'all', label: 'All roles' },
    { key: 'admin', label: ROLE_LABEL.admin },
    { key: 'manager', label: ROLE_LABEL.manager },
    { key: 'sourcer', label: ROLE_LABEL.sourcer },
    { key: 'copywriter', label: ROLE_LABEL.copywriter },
    { key: 'client', label: ROLE_LABEL.client },
  ]

  const statusFilters: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'All status' },
    { key: 'active', label: 'Active' },
    { key: 'invited', label: 'Invited' },
    { key: 'disabled', label: 'Disabled' },
  ]

  const loadingCountLabel =
    rowBusyId !== null || disableBusy || activateBusy || resendBusy ? 'Loading…' : null

  return (
    <div className="gap-layout flex flex-col">
      <section className="border-border/60 bg-card shadow-soft overflow-hidden rounded-2xl border">
        <header className="border-border/60 gap-block px-section py-block flex flex-col border-b sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-inset min-w-0">
            <h2 className="font-display text-foreground text-xl font-semibold tracking-tight">
              User management
            </h2>
            <p className="text-muted-foreground max-w-xl text-xs leading-relaxed">
              Invite teammates, change roles, and manage access.
            </p>
          </div>
          <div className="gap-block flex shrink-0 flex-wrap items-center sm:justify-end">
            <div className="relative min-w-48 flex-1 sm:max-w-xs sm:flex-none">
              <Search
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                aria-hidden
              />
              <FormControlInput
                type="search"
                placeholder="Search name or email…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pr-3 pl-10"
                aria-label="Search users"
              />
            </div>
            <Button
              type="button"
              variant="cta"
              size="default"
              className="h-10 min-h-10 shrink-0 rounded-full"
              onClick={() => {
                setFormMessage(null)
                setInviteOpen(true)
              }}
            >
              <Plus className="size-4" aria-hidden />
              Invite user
            </Button>
          </div>
        </header>

        <div className="border-border/60 gap-inset px-section py-block flex flex-col border-b">
          <div className="text-muted-foreground gap-inset flex items-center text-xs font-medium">
            <Filter className="size-3.5 shrink-0" aria-hidden />
            <span>Filters</span>
          </div>
          <div className="gap-inset flex flex-wrap items-center">
            {roleFilters.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                className={chipClasses(roleFilter === key)}
                onClick={() => setRoleFilter(key)}
              >
                {label}
              </button>
            ))}
            <span className="bg-border mx-1 hidden h-4 w-px sm:block" aria-hidden />
            {statusFilters.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                className={chipClasses(statusFilter === key)}
                onClick={() => setStatusFilter(key)}
              >
                {label}
              </button>
            ))}
            <span className="text-muted-foreground ml-auto text-xs tabular-nums">
              {loadingCountLabel ??
                (filtered.length === initialRows.length
                  ? `${initialRows.length} users`
                  : `${filtered.length} of ${initialRows.length} users`)}
            </span>
          </div>
        </div>

        <div className="flex flex-col">
          {formMessage ? (
            <div className="border-border/60 px-section py-block border-b">
              <p className="text-foreground text-sm" role="status">
                {formMessage}
              </p>
            </div>
          ) : null}

          {filtered.length === 0 ? (
            <div className="px-section py-block">
              <div className="gap-block py-hero flex flex-col items-center text-center">
                <span className="bg-primary-soft text-primary-ink flex size-14 items-center justify-center rounded-full">
                  <Users className="size-7" aria-hidden />
                </span>
                <h3 className="font-display text-foreground text-lg font-semibold tracking-tight">
                  No users match those filters
                </h3>
                <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">
                  Try clearing filters or invite someone new to your workspace.
                </p>
                <div className="gap-inset mt-block flex flex-wrap justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setQuery('')
                      setRoleFilter('all')
                      setStatusFilter('all')
                    }}
                  >
                    Clear filters
                  </Button>
                  <Button
                    type="button"
                    variant="cta"
                    size="default"
                    className="h-10 min-h-10 rounded-full"
                    onClick={() => {
                      setFormMessage(null)
                      setInviteOpen(true)
                    }}
                  >
                    <Plus className="size-4" aria-hidden />
                    Invite user
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="hidden w-full min-w-0 md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border bg-transparent hover:bg-transparent has-aria-expanded:bg-transparent data-[state=selected]:bg-transparent [&>th]:border-b-0">
                      <TableHead className="text-muted-foreground h-11 px-4 font-medium">
                        User
                      </TableHead>
                      <TableHead className="text-muted-foreground h-11 px-4 font-medium">
                        Role
                      </TableHead>
                      <TableHead className="text-muted-foreground h-11 px-4 font-medium">
                        Status
                      </TableHead>
                      <TableHead className="text-muted-foreground h-11 px-4 font-medium">
                        Last active
                      </TableHead>
                      <TableHead className="text-muted-foreground h-11 pr-5 pl-4 text-right font-medium">
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((row) => {
                      const email = row.email ?? ''
                      const resendEmail = orgUserResendInviteEmail(row)
                      const name = adminUserDisplayName(row)
                      const st = rowStatus(row)
                      const disabledRow = rowBusyId === row.id
                      const canResend = orgUserCanResendInvite(row)

                      return (
                        <TableRow
                          key={row.id}
                          className="group/user-row border-border cursor-pointer hover:bg-transparent has-aria-expanded:bg-transparent data-[state=selected]:bg-transparent"
                          onClick={(e) => navigateToUser(e, row.id)}
                        >
                          <TableCell className={USER_ROW_CELL}>
                            <Link
                              href={`/settings/users/${row.id}`}
                              className="gap-block flex min-w-0 items-center"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <UserAvatar fullName={row.full_name} email={email || name} />
                              <div className="min-w-0 text-left">
                                <p className="text-foreground truncate font-medium">{name}</p>
                                <p className="text-muted-foreground truncate text-xs">
                                  {email || '—'}
                                </p>
                              </div>
                            </Link>
                          </TableCell>
                          <TableCell className={USER_ROW_CELL}>
                            <RoleBadge role={row.role} />
                          </TableCell>
                          <TableCell className={USER_ROW_CELL}>
                            <StatusBadge status={st} />
                          </TableCell>
                          <TableCell className={USER_ROW_CELL_MUTED}>
                            {formatRelativeLastActive(row.last_sign_in_at)}
                          </TableCell>
                          <TableCell
                            className={USER_ROW_CELL_ACTIONS}
                            data-row-actions
                            onClick={(e) => e.stopPropagation()}
                          >
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                type="button"
                                disabled={disabledRow}
                                aria-label={`Manage ${name}`}
                                className={cn(
                                  buttonVariants({ variant: 'ghost', size: 'icon' }),
                                  'rounded-full opacity-80 hover:opacity-100'
                                )}
                              >
                                <MoreHorizontal className="size-4" aria-hidden />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="min-w-44">
                                <DropdownMenuGroup>
                                  <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
                                    Manage
                                  </DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    disabled={disabledRow}
                                    onClick={() => openEdit(row)}
                                    className="gap-2"
                                  >
                                    <UserCog className="size-4" aria-hidden />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    disabled={disabledRow || !canResend}
                                    onClick={() => setResendTargetEmail(resendEmail)}
                                    className="gap-2"
                                  >
                                    <Mail className="size-4" aria-hidden />
                                    Resend invite
                                  </DropdownMenuItem>
                                  {isUserBanned(row) ? (
                                    <DropdownMenuItem
                                      disabled={
                                        disabledRow ||
                                        row.id === currentUserId ||
                                        row.role === 'admin'
                                      }
                                      onClick={() => setActivateTarget(row)}
                                      className="gap-2"
                                    >
                                      <UserPlus className="size-4" aria-hidden />
                                      Activate
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem
                                      variant="destructive"
                                      disabled={
                                        disabledRow ||
                                        row.id === currentUserId ||
                                        row.role === 'admin'
                                      }
                                      onClick={() => void beginDisable(row)}
                                      className="gap-2"
                                    >
                                      <UserMinus className="size-4" aria-hidden />
                                      Disable
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuGroup>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="px-section py-block md:hidden">
                <ul className="divide-border divide-y rounded-xl border">
                  {filtered.map((row) => {
                    const email = row.email ?? ''
                    const resendEmail = orgUserResendInviteEmail(row)
                    const name = adminUserDisplayName(row)
                    const st = rowStatus(row)
                    const disabledRow = rowBusyId === row.id
                    const canResend = orgUserCanResendInvite(row)

                    return (
                      <li key={row.id}>
                        <div
                          className="gap-block px-inset py-block flex cursor-pointer flex-col"
                          onClick={(e) => navigateToUser(e, row.id)}
                        >
                          <div className="gap-block flex items-start justify-between">
                            <Link
                              href={`/settings/users/${row.id}`}
                              className="gap-block flex min-w-0 flex-1 items-center"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <UserAvatar fullName={row.full_name} email={email || name} />
                              <div className="min-w-0">
                                <p className="text-foreground truncate font-medium">{name}</p>
                                <p className="text-muted-foreground truncate text-xs">{email}</p>
                              </div>
                            </Link>
                            <div data-row-actions onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger
                                  type="button"
                                  disabled={disabledRow}
                                  aria-label={`Manage ${name}`}
                                  className={cn(
                                    buttonVariants({ variant: 'ghost', size: 'icon' }),
                                    'rounded-full opacity-80 hover:opacity-100'
                                  )}
                                >
                                  <MoreHorizontal className="size-4" aria-hidden />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="min-w-44">
                                  <DropdownMenuGroup>
                                    <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
                                      Manage
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      disabled={disabledRow}
                                      onClick={() => openEdit(row)}
                                      className="gap-2"
                                    >
                                      <UserCog className="size-4" aria-hidden />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      disabled={disabledRow || !canResend}
                                      onClick={() => setResendTargetEmail(resendEmail)}
                                      className="gap-2"
                                    >
                                      <Mail className="size-4" aria-hidden />
                                      Resend invite
                                    </DropdownMenuItem>
                                    {isUserBanned(row) ? (
                                      <DropdownMenuItem
                                        disabled={
                                          disabledRow ||
                                          row.id === currentUserId ||
                                          row.role === 'admin'
                                        }
                                        onClick={() => setActivateTarget(row)}
                                        className="gap-2"
                                      >
                                        <UserPlus className="size-4" aria-hidden />
                                        Activate
                                      </DropdownMenuItem>
                                    ) : (
                                      <DropdownMenuItem
                                        variant="destructive"
                                        disabled={
                                          disabledRow ||
                                          row.id === currentUserId ||
                                          row.role === 'admin'
                                        }
                                        onClick={() => void beginDisable(row)}
                                        className="gap-2"
                                      >
                                        <UserMinus className="size-4" aria-hidden />
                                        Disable
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuGroup>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                          <div className="gap-inset flex flex-wrap items-center justify-between pl-14">
                            <div className="gap-inset flex flex-wrap items-center">
                              <RoleBadge role={row.role} />
                              <StatusBadge status={st} />
                            </div>
                            <span className="text-muted-foreground text-xs tabular-nums">
                              {formatRelativeLastActive(row.last_sign_in_at)}
                            </span>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </>
          )}
        </div>
      </section>

      <Sheet
        open={inviteOpen}
        onOpenChange={(open) => {
          setInviteOpen(open)
          if (open) {
            setFormMessage(null)
          }
        }}
      >
        <SheetContent side="right" className="gap-0 sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Invitation</SheetTitle>
            <SheetDescription>
              Sends an invitation email. They will set a password, then sign in.
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={onInviteSubmit} className="gap-block flex flex-col px-4 pb-4">
            <div className="gap-inset flex flex-col">
              <Label htmlFor="users-invite-email" className="text-foreground text-sm font-medium">
                Email
              </Label>
              <FormControlInput
                id="users-invite-email"
                type="email"
                autoComplete="off"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="gap-inset flex flex-col">
              <Label htmlFor="users-invite-name" className="text-foreground text-sm font-medium">
                Full name (optional)
              </Label>
              <FormControlInput
                id="users-invite-name"
                type="text"
                autoComplete="name"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
              />
            </div>
            <div className="gap-inset flex flex-col">
              <Label htmlFor="users-invite-role" className="text-foreground text-sm font-medium">
                Role
              </Label>
              <SettingsRoleSelect
                id="users-invite-role"
                value={inviteRole}
                onChange={setInviteRole}
              />
            </div>
            <SheetFooter className="gap-block pt-block px-0 sm:flex-row">
              <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="default" disabled={inviteBusy}>
                {inviteBusy ? 'Sending…' : 'Send Invite'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <EditUserSheet
        open={editOpen}
        onOpenChange={(o) => {
          setEditOpen(o)
          if (!o) setEditTarget(null)
        }}
        target={editTarget}
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
        open={!!activateTarget}
        busy={activateBusy}
        displayName={activateTarget ? adminUserDisplayName(activateTarget) : ''}
        onOpenChange={(open) => {
          if (!open) setActivateTarget(null)
        }}
        onConfirm={() => void confirmActivate()}
      />

      <AdminUserResendInviteDialog
        open={!!resendTargetEmail}
        busy={resendBusy}
        email={resendTargetEmail ?? ''}
        onOpenChange={(open) => {
          if (!open) setResendTargetEmail(null)
        }}
        onConfirm={() => void onResendConfirmed()}
      />
    </div>
  )
}
