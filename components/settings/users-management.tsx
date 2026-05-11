'use client'

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Filter,
  Mail,
  Plus,
  RotateCcw,
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
import type {
  OrgUsersListRoleFilter,
  OrgUsersListStatusFilter,
} from '@/lib/org-users/load-org-users'
import type { OrgInviteRole } from '@/lib/org-users/org-invite-roles'
import type { OrgUserRowJson } from '@/lib/org-users/types'
import { formatRelativeLastActive } from '@/lib/format-relative-auth'
import { Button, buttonVariants } from '@/components/ui/button'
import { TableRowActionsTrigger } from '@/components/ui/table-row-actions-trigger'
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
import {
  SETTINGS_RIGHT_SHEET_CONTENT_CLASS,
  SettingsRightSheet,
} from '@/components/settings/settings-right-sheet'
import { ROLE_LABEL, RoleBadge } from '@/components/settings/role-badge'
import { SettingsTablePagination } from '@/components/settings/settings-table-pagination'
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

type RoleFilter = OrgUsersListRoleFilter
type StatusFilter = OrgUsersListStatusFilter

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
    'rounded-full border px-2.5 text-xs font-medium capitalize transition-colors min-h-10 py-2 sm:min-h-0 sm:py-1',
    active
      ? 'border-primary bg-primary-soft text-primary-ink hover:bg-primary-soft hover:text-primary-ink'
      : 'border-border/60 bg-background text-foreground hover:bg-muted hover:text-foreground'
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
  listMode = 'admin',
  initialRows,
  totalCount,
  page,
  pageSize,
  q,
  roleFilter,
  statusFilter,
  copywriterCandidates,
  currentUserId,
}: {
  listMode?: 'admin' | 'manager'
  initialRows: OrgUserRowJson[]
  totalCount: number
  page: number
  pageSize: number
  q: string
  roleFilter: OrgUsersListRoleFilter
  statusFilter: OrgUsersListStatusFilter
  copywriterCandidates: OrgUserRowJson[]
  currentUserId: string
}) {
  const isAdminView = listMode === 'admin'
  const router = useRouter()
  const [searchDraft, setSearchDraft] = useState(q)
  const [prevQ, setPrevQ] = useState(q)
  if (q !== prevQ) {
    setPrevQ(q)
    setSearchDraft(q)
  }

  const buildListHref = useCallback(
    (updates: {
      page?: number
      q?: string
      role?: OrgUsersListRoleFilter
      status?: OrgUsersListStatusFilter
    }) => {
      const params = new URLSearchParams()
      const qUse = updates.q !== undefined ? updates.q : q
      const roleUse = updates.role !== undefined ? updates.role : roleFilter
      const statusUse = updates.status !== undefined ? updates.status : statusFilter
      const pageUse = updates.page !== undefined ? updates.page : page

      if (qUse.trim()) params.set('q', qUse.trim())
      if (roleUse !== 'all') params.set('role', roleUse)
      if (statusUse !== 'all') params.set('status', statusUse)
      if (pageUse > 1) params.set('page', String(pageUse))
      const s = params.toString()
      return s ? `/settings/users?${s}` : '/settings/users'
    },
    [q, roleFilter, statusFilter, page]
  )

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    router.push(buildListHref({ page: 1, q: searchDraft }), { scroll: false })
  }

  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState<OrgInviteRole>('client')
  const [inviteBusy, setInviteBusy] = useState(false)

  const [editOpen, setEditOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<OrgUserRowJson | null>(null)
  const [mobileDetailUser, setMobileDetailUser] = useState<OrgUserRowJson | null>(null)

  const [formMessage, setFormMessage] = useState<string | null>(null)

  const [rowBusyId, setRowBusyId] = useState<string | null>(null)

  const [disableDialog, setDisableDialog] = useState<AdminDisableDialogState>(null)
  const [disableBusy, setDisableBusy] = useState(false)

  const [activateTarget, setActivateTarget] = useState<OrgUserRowJson | null>(null)
  const [activateBusy, setActivateBusy] = useState(false)

  const [resendTargetEmail, setResendTargetEmail] = useState<string | null>(null)
  const [resendBusy, setResendBusy] = useState(false)

  const copywriterReplacementOptions = useMemo(() => {
    const rowId = disableDialog?.row.id
    if (!rowId) return copywriterCandidates
    return copywriterCandidates.filter((r) => r.id !== rowId)
  }, [copywriterCandidates, disableDialog?.row.id])

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

  function openEditFromMobileDetail(row: OrgUserRowJson) {
    setMobileDetailUser(null)
    queueMicrotask(() => openEdit(row))
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

  const usersCountLabel = `${totalCount} user${totalCount === 1 ? '' : 's'}`

  return (
    <div className="gap-layout flex flex-col">
      <section className="border-border/60 bg-card shadow-soft overflow-hidden rounded-2xl border">
        <header className="border-border/60 gap-block px-section py-block flex flex-col border-b sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-inset min-w-0">
            <h2 className="font-display text-foreground text-xl font-semibold tracking-tight">
              {isAdminView ? 'User management' : 'Users'}
            </h2>
            <p className="text-muted-foreground max-w-xl text-xs leading-relaxed">
              {isAdminView
                ? 'Invite teammates, change roles, and manage access.'
                : 'Full directory of workspace users. Most admin-only actions are hidden; contact an admin to change roles or invites.'}
            </p>
          </div>
          <div className="gap-block flex w-full flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <form
              onSubmit={onSearchSubmit}
              className="relative w-full min-w-0 sm:max-w-xs sm:min-w-48 sm:flex-none"
            >
              <Search
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                aria-hidden
              />
              <FormControlInput
                type="search"
                placeholder="Search name or email…"
                value={searchDraft}
                onChange={(e) => {
                  const v = e.target.value
                  setSearchDraft(v)
                  if (!v.trim() && q.trim()) {
                    router.push(buildListHref({ page: 1, q: '' }), { scroll: false })
                  }
                }}
                className="pr-3 pl-10"
                aria-label="Search users"
              />
            </form>
            {isAdminView ? (
              <Button
                type="button"
                variant="cta"
                size="default"
                className="h-10 min-h-10 w-full shrink-0 justify-center rounded-full sm:w-auto"
                onClick={() => {
                  setFormMessage(null)
                  setInviteOpen(true)
                }}
              >
                <Plus className="size-4" aria-hidden />
                Invite user
              </Button>
            ) : null}
          </div>
        </header>

        <div className="border-border/60 gap-inset px-section py-block flex flex-col border-b">
          <div className="text-muted-foreground gap-inset flex items-center text-xs font-medium">
            <Filter className="size-3.5 shrink-0" aria-hidden />
            <span>Filters</span>
          </div>
          <div className="gap-inset flex flex-col sm:flex-row sm:flex-wrap sm:items-center">
            <div className="gap-inset flex flex-wrap items-center">
              {roleFilters.map(({ key, label }) => (
                <Button
                  key={key}
                  type="button"
                  variant="outline"
                  aria-pressed={roleFilter === key}
                  className={chipClasses(roleFilter === key)}
                  onClick={() => {
                    router.push(buildListHref({ page: 1, role: key }), { scroll: false })
                  }}
                >
                  {label}
                </Button>
              ))}
              {roleFilters.length > 0 ? (
                <span className="bg-border mx-1 hidden h-4 w-px sm:block" aria-hidden />
              ) : null}
              {statusFilters.map(({ key, label }) => (
                <Button
                  key={key}
                  type="button"
                  variant="outline"
                  aria-pressed={statusFilter === key}
                  className={chipClasses(statusFilter === key)}
                  onClick={() => {
                    router.push(buildListHref({ page: 1, status: key }), { scroll: false })
                  }}
                >
                  {label}
                </Button>
              ))}
            </div>
            <span className="text-muted-foreground w-full text-end text-xs tabular-nums sm:ml-auto sm:w-auto sm:text-start">
              {loadingCountLabel ?? usersCountLabel}
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

          {totalCount === 0 ? (
            <div className="px-section py-block">
              <div className="gap-block py-hero flex flex-col items-center text-center">
                <span className="bg-primary-soft text-primary-ink flex size-14 items-center justify-center rounded-full">
                  <Users className="size-7" aria-hidden />
                </span>
                <h3 className="font-display text-foreground text-lg font-semibold tracking-tight">
                  No users match those filters
                </h3>
                <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">
                  {isAdminView
                    ? 'Try clearing filters or invite someone new to your workspace.'
                    : 'Try clearing filters or changing role or status chips.'}
                </p>
                <div className="gap-inset mt-block mx-auto flex w-full max-w-sm flex-col items-stretch justify-center sm:flex-row sm:flex-wrap sm:justify-center">
                  <Link
                    href={buildListHref({ page: 1, q: '', role: 'all', status: 'all' })}
                    scroll={false}
                    className={cn(
                      buttonVariants({ variant: 'outline', size: 'default' }),
                      'h-10 min-h-10 w-full shrink-0 justify-center gap-2 rounded-full sm:w-auto'
                    )}
                  >
                    <RotateCcw className="size-4" aria-hidden />
                    Clear filters
                  </Link>
                  {isAdminView ? (
                    <Button
                      type="button"
                      variant="cta"
                      size="default"
                      className="h-10 min-h-10 w-full justify-center rounded-full sm:w-auto"
                      onClick={() => {
                        setFormMessage(null)
                        setInviteOpen(true)
                      }}
                    >
                      <Plus className="size-4" aria-hidden />
                      Invite user
                    </Button>
                  ) : null}
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
                        {isAdminView ? <span className="sr-only">Actions</span> : 'Details'}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {initialRows.map((row) => {
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
                            {isAdminView ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger
                                  disabled={disabledRow}
                                  render={<TableRowActionsTrigger label={`Manage ${name}`} />}
                                />
                                <DropdownMenuContent align="end" className="min-w-48">
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
                            ) : (
                              <Link
                                href={`/settings/users/${row.id}`}
                                className={cn(
                                  buttonVariants({ variant: 'outline', size: 'sm' }),
                                  'inline-flex rounded-full'
                                )}
                                onClick={(e) => e.stopPropagation()}
                              >
                                Open
                              </Link>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="px-section py-block md:hidden">
                <ul className="divide-border divide-y rounded-xl border">
                  {initialRows.map((row) => {
                    const email = row.email ?? ''
                    const resendEmail = orgUserResendInviteEmail(row)
                    const name = adminUserDisplayName(row)
                    const st = rowStatus(row)
                    const disabledRow = rowBusyId === row.id
                    const canResend = orgUserCanResendInvite(row)

                    return (
                      <li key={row.id}>
                        <div className="gap-block px-inset py-block flex flex-col">
                          <div className="gap-block flex items-start justify-between">
                            <Button
                              type="button"
                              variant="ghost"
                              className="hover:bg-muted/40 gap-block h-auto min-w-0 flex-1 flex-col items-start rounded-lg px-0 py-0 text-left transition-colors"
                              onClick={() => setMobileDetailUser(row)}
                              aria-label={`${name}, user details`}
                            >
                              <div className="gap-block flex items-center">
                                <UserAvatar fullName={row.full_name} email={email || name} />
                                <div className="min-w-0">
                                  <p className="text-foreground truncate font-medium">{name}</p>
                                  <p className="text-muted-foreground truncate text-xs">{email}</p>
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
                            </Button>
                            <div data-row-actions onClick={(e) => e.stopPropagation()}>
                              {isAdminView ? (
                                <DropdownMenu>
                                  <DropdownMenuTrigger
                                    disabled={disabledRow}
                                    render={<TableRowActionsTrigger label={`Manage ${name}`} />}
                                  />
                                  <DropdownMenuContent align="end" className="min-w-48">
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
                              ) : (
                                <Link
                                  href={`/settings/users/${row.id}`}
                                  className={cn(
                                    buttonVariants({ variant: 'outline', size: 'sm' }),
                                    'rounded-full'
                                  )}
                                >
                                  Open
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>

              <SettingsTablePagination
                page={page}
                pageSize={pageSize}
                totalCount={totalCount}
                buildHref={(p) => buildListHref({ page: p })}
              />
            </>
          )}
        </div>
      </section>

      {isAdminView ? (
        <Sheet
          open={inviteOpen}
          onOpenChange={(open) => {
            setInviteOpen(open)
            if (open) {
              setFormMessage(null)
            }
          }}
        >
          <SheetContent side="right" className={cn(SETTINGS_RIGHT_SHEET_CONTENT_CLASS)}>
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
      ) : null}

      <SettingsRightSheet
        open={mobileDetailUser !== null}
        onOpenChange={(open) => {
          if (!open) setMobileDetailUser(null)
        }}
        title={mobileDetailUser ? adminUserDisplayName(mobileDetailUser) : '\u200b'}
        description={mobileDetailUser?.email ?? undefined}
        footerClassName="flex-col items-stretch"
        footer={
          mobileDetailUser ? (
            isAdminView ? (
              <>
                <Link
                  href={`/settings/users/${mobileDetailUser.id}`}
                  scroll={false}
                  className={cn(
                    buttonVariants({ variant: 'outline', size: 'default' }),
                    'h-10 min-h-10 w-full shrink-0 justify-center rounded-full'
                  )}
                  onClick={() => setMobileDetailUser(null)}
                >
                  View full profile
                </Link>
                <Button
                  type="button"
                  variant="default"
                  className="h-10 min-h-10 w-full shrink-0 justify-center gap-2 rounded-full"
                  disabled={rowBusyId === mobileDetailUser.id}
                  onClick={() => openEditFromMobileDetail(mobileDetailUser)}
                >
                  <UserCog className="size-4" aria-hidden />
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 min-h-10 w-full shrink-0 justify-center gap-2 rounded-full"
                  disabled={
                    rowBusyId === mobileDetailUser.id || !orgUserCanResendInvite(mobileDetailUser)
                  }
                  onClick={() => {
                    const emailToResend = orgUserResendInviteEmail(mobileDetailUser)
                    setMobileDetailUser(null)
                    setResendTargetEmail(emailToResend)
                  }}
                >
                  <Mail className="size-4" aria-hidden />
                  Resend invite
                </Button>
                {isUserBanned(mobileDetailUser) ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 min-h-10 w-full shrink-0 justify-center gap-2 rounded-full"
                    disabled={
                      rowBusyId === mobileDetailUser.id ||
                      mobileDetailUser.id === currentUserId ||
                      mobileDetailUser.role === 'admin'
                    }
                    onClick={() => {
                      const target = mobileDetailUser
                      setMobileDetailUser(null)
                      setActivateTarget(target)
                    }}
                  >
                    <UserPlus className="size-4" aria-hidden />
                    Activate
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="destructive"
                    className="h-10 min-h-10 w-full shrink-0 justify-center gap-2 rounded-full"
                    disabled={
                      rowBusyId === mobileDetailUser.id ||
                      mobileDetailUser.id === currentUserId ||
                      mobileDetailUser.role === 'admin'
                    }
                    onClick={() => {
                      const target = mobileDetailUser
                      setMobileDetailUser(null)
                      void beginDisable(target)
                    }}
                  >
                    <UserMinus className="size-4" aria-hidden />
                    Disable
                  </Button>
                )}
              </>
            ) : (
              <Link
                href={`/settings/users/${mobileDetailUser.id}`}
                scroll={false}
                className={cn(
                  buttonVariants({ variant: 'cta', size: 'default' }),
                  'h-10 min-h-10 w-full shrink-0 justify-center rounded-full'
                )}
                onClick={() => setMobileDetailUser(null)}
              >
                View full profile
              </Link>
            )
          ) : null
        }
      >
        {mobileDetailUser ? (
          <>
            <div className="gap-block flex items-center">
              <UserAvatar
                fullName={mobileDetailUser.full_name}
                email={mobileDetailUser.email ?? adminUserDisplayName(mobileDetailUser)}
              />
              <div className="min-w-0">
                <p className="text-foreground font-medium">
                  {adminUserDisplayName(mobileDetailUser)}
                </p>
                <p className="text-muted-foreground truncate text-xs">
                  {mobileDetailUser.email ?? '—'}
                </p>
              </div>
            </div>
            <div className="gap-inset flex flex-wrap items-center">
              <RoleBadge role={mobileDetailUser.role} />
              <StatusBadge status={rowStatus(mobileDetailUser)} />
            </div>
            <p className="text-muted-foreground text-xs tabular-nums">
              Last active {formatRelativeLastActive(mobileDetailUser.last_sign_in_at)}
            </p>
          </>
        ) : null}
      </SettingsRightSheet>

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
