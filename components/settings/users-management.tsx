'use client'

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ChevronDown,
  Filter,
  Mail,
  Plus,
  RotateCcw,
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
import { FilterSelect } from '@/components/ui/filter-bar'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/ui/page-header'
import { SearchField } from '@/components/ui/search-field'
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

/** Named group so nested controls (links, menus) never steal `group-hover` from the row. */
const USER_ROW_CELL =
  'px-block py-inset align-middle whitespace-normal transition-colors group-hover/user-row:bg-muted/50 group-has-[[aria-expanded=true]]/user-row:bg-muted/50'

const USER_ROW_CELL_MUTED =
  'text-muted-foreground px-block py-inset align-middle tabular-nums whitespace-normal transition-colors group-hover/user-row:bg-muted/50 group-has-[[aria-expanded=true]]/user-row:bg-muted/50'

const USER_ROW_CELL_ACTIONS =
  'px-block py-inset align-middle text-right whitespace-normal transition-colors group-hover/user-row:bg-muted/50 group-has-[[aria-expanded=true]]/user-row:bg-muted/50'

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
  const canChangeStatus = listMode === 'admin'
  const router = useRouter()

  const buildListHref = useCallback(
    (updates: {
      page?: number
      role?: OrgUsersListRoleFilter
      status?: OrgUsersListStatusFilter
    }) => {
      const params = new URLSearchParams()
      const roleUse = updates.role !== undefined ? updates.role : roleFilter
      const statusUse = updates.status !== undefined ? updates.status : statusFilter
      const pageUse = updates.page !== undefined ? updates.page : page

      if (q.trim()) params.set('q', q.trim())
      if (roleUse !== 'all') params.set('role', roleUse)
      if (statusUse !== 'all') params.set('status', statusUse)
      if (pageUse > 1) params.set('page', String(pageUse))
      const s = params.toString()
      return s ? `/settings/users?${s}` : '/settings/users'
    },
    [q, roleFilter, statusFilter, page]
  )

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

  const [isOpen, setIsOpen] = useState(false)

  const loadingCountLabel =
    rowBusyId !== null || disableBusy || activateBusy || resendBusy ? 'Loading…' : null

  const usersCountLabel = `${totalCount} user${totalCount === 1 ? '' : 's'}`

  return (
    <div className="gap-layout flex flex-col">
      <PageHeader
        title="User management"
        description={
          canChangeStatus
            ? 'Invite teammates, change roles, and manage access.'
            : 'Invite teammates and manage profiles. Only admins can activate or disable users.'
        }
        action={
          <div className="gap-inset flex w-full min-w-0 flex-row items-center sm:w-auto sm:justify-end">
            <SearchField name="q" placeholder="Search name or email…" ariaLabel="Search users" />
            <Button
              type="button"
              variant="cta"
              size="default"
              className="h-10 min-h-10 shrink-0 justify-center rounded-full"
              onClick={() => {
                setFormMessage(null)
                setInviteOpen(true)
              }}
            >
              <Plus className="size-4" aria-hidden />
              Invite user
            </Button>
          </div>
        }
      />

      <section className="border-border/60 bg-card shadow-soft sticky top-14 z-30 overflow-hidden rounded-2xl border">
        <div className="px-section py-block gap-inset flex items-center sm:flex-wrap">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-muted-foreground gap-inset mb-0.5 flex shrink-0 items-center text-xs font-medium"
          >
            <Filter className="size-3.5 shrink-0" aria-hidden />
            <span>Filters</span>
            <ChevronDown
              className={cn(
                'size-3.5 shrink-0 transition-transform duration-200 ease-in-out',
                isOpen && 'rotate-180'
              )}
              aria-hidden
            />
          </button>
          <span className="text-muted-foreground ml-auto shrink-0 self-end pb-0.5 text-xs tabular-nums">
            {loadingCountLabel ?? usersCountLabel}
          </span>
        </div>
        <div
          className={cn(
            'overflow-hidden transition-all duration-300',
            isOpen ? 'max-h-125 opacity-100' : 'max-h-0 opacity-0'
          )}
        >
          <div className="px-section pb-block gap-inset flex items-end overflow-x-auto sm:flex-wrap">
            <div className="flex shrink-0 flex-col gap-0.5">
              <span className="text-muted-foreground px-1 text-[10px] font-medium">Role</span>
              <FilterSelect
                aria-label="Filter by role"
                value={roleFilter}
                onChange={(e) =>
                  router.push(
                    buildListHref({ page: 1, role: e.target.value as OrgUsersListRoleFilter }),
                    { scroll: false }
                  )
                }
                className="h-8 w-auto max-w-32 min-w-0 rounded-full px-1 text-xs"
              >
                {roleFilters.map(({ key, label }) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </FilterSelect>
            </div>
            <div className="flex shrink-0 flex-col gap-0.5">
              <span className="text-muted-foreground px-1 text-[10px] font-medium">Status</span>
              <FilterSelect
                aria-label="Filter by status"
                value={statusFilter}
                onChange={(e) =>
                  router.push(
                    buildListHref({ page: 1, status: e.target.value as OrgUsersListStatusFilter }),
                    { scroll: false }
                  )
                }
                className="h-8 w-auto max-w-32 min-w-0 rounded-full px-1 text-xs"
              >
                {statusFilters.map(({ key, label }) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </FilterSelect>
            </div>
            {roleFilter !== 'all' || statusFilter !== 'all' || q.trim() ? (
              <Link
                href={'/settings/users'}
                scroll={false}
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'sm' }),
                  'gap-inset px-block h-8 shrink-0 self-end rounded-full text-xs'
                )}
              >
                <RotateCcw className="size-3.5" aria-hidden />
                Clear filters
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section className="border-border/60 bg-card shadow-soft overflow-hidden rounded-2xl border">
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
                  Try clearing filters or invite someone new to your workspace.
                </p>
                <div className="gap-inset mt-block mx-auto flex w-full max-w-sm flex-col items-stretch justify-center sm:flex-row sm:flex-wrap sm:justify-center">
                  <Link
                    href={'/settings/users'}
                    scroll={false}
                    className={cn(
                      buttonVariants({ variant: 'outline', size: 'default' }),
                      'gap-inset h-10 min-h-10 w-full shrink-0 justify-center rounded-full sm:w-auto'
                    )}
                  >
                    <RotateCcw className="size-4" aria-hidden />
                    Clear filters
                  </Link>
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
                                    className="gap-inset"
                                  >
                                    <UserCog className="size-4" aria-hidden />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    disabled={disabledRow || !canResend}
                                    onClick={() => setResendTargetEmail(resendEmail)}
                                    className="gap-inset"
                                  >
                                    <Mail className="size-4" aria-hidden />
                                    Resend invite
                                  </DropdownMenuItem>
                                  {canChangeStatus &&
                                    (isUserBanned(row) ? (
                                      <DropdownMenuItem
                                        disabled={
                                          disabledRow ||
                                          row.id === currentUserId ||
                                          row.role === 'admin'
                                        }
                                        onClick={() => setActivateTarget(row)}
                                        className="gap-inset"
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
                                        className="gap-inset"
                                      >
                                        <UserMinus className="size-4" aria-hidden />
                                        Disable
                                      </DropdownMenuItem>
                                    ))}
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
                                      className="gap-inset"
                                    >
                                      <UserCog className="size-4" aria-hidden />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      disabled={disabledRow || !canResend}
                                      onClick={() => setResendTargetEmail(resendEmail)}
                                      className="gap-inset"
                                    >
                                      <Mail className="size-4" aria-hidden />
                                      Resend invite
                                    </DropdownMenuItem>
                                    {canChangeStatus &&
                                      (isUserBanned(row) ? (
                                        <DropdownMenuItem
                                          disabled={
                                            disabledRow ||
                                            row.id === currentUserId ||
                                            row.role === 'admin'
                                          }
                                          onClick={() => setActivateTarget(row)}
                                          className="gap-inset"
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
                                          className="gap-inset"
                                        >
                                          <UserMinus className="size-4" aria-hidden />
                                          Disable
                                        </DropdownMenuItem>
                                      ))}
                                  </DropdownMenuGroup>
                                </DropdownMenuContent>
                              </DropdownMenu>
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

      <Sheet
        open={inviteOpen}
        onOpenChange={(open) => {
          setInviteOpen(open)
          if (open) {
            setFormMessage(null)
            if (listMode === 'manager') setInviteRole('client')
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
                excludeRoles={listMode === 'manager' ? ['manager'] : []}
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
                className="gap-inset h-10 min-h-10 w-full shrink-0 justify-center rounded-full"
                disabled={rowBusyId === mobileDetailUser.id}
                onClick={() => openEditFromMobileDetail(mobileDetailUser)}
              >
                <UserCog className="size-4" aria-hidden />
                Edit
              </Button>
              <Button
                type="button"
                variant="outline"
                className="gap-inset h-10 min-h-10 w-full shrink-0 justify-center rounded-full"
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
              {canChangeStatus &&
                (isUserBanned(mobileDetailUser) ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-inset h-10 min-h-10 w-full shrink-0 justify-center rounded-full"
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
                    className="gap-inset h-10 min-h-10 w-full shrink-0 justify-center rounded-full"
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
                ))}
            </>
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
        viewerRole={listMode}
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
