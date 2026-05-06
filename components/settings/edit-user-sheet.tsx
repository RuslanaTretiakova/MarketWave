'use client'

import { useState } from 'react'

import { updateTeamMemberProfile } from '@/lib/auth/user-admin-actions'
import type { OrgUserRowJson } from '@/lib/org-users/types'
import { ORG_INVITABLE_ROLE_VALUES, type OrgInviteRole } from '@/lib/org-users/org-invite-roles'
import { SETTINGS_RIGHT_SHEET_CONTENT_CLASS } from '@/components/settings/settings-right-sheet'
import { SettingsRoleSelect } from '@/components/settings/settings-role-select'
import { Button } from '@/components/ui/button'
import { FormControlInput, FormControlTextarea } from '@/components/ui/form-control'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

function initialInviteRole(target: OrgUserRowJson): OrgInviteRole {
  return target.role === 'admin'
    ? 'client'
    : ORG_INVITABLE_ROLE_VALUES.includes(target.role as OrgInviteRole)
      ? (target.role as OrgInviteRole)
      : 'client'
}

function editUserFormKey(target: OrgUserRowJson): string {
  return [
    target.id,
    target.full_name ?? '',
    target.role,
    target.bio ?? '',
    target.company_name ?? '',
    target.phone ?? '',
    target.email ?? '',
    target.profile_email ?? '',
    target.created_at ?? '',
  ].join('|')
}

function EditUserForm({
  target,
  onCancel,
  onSaved,
}: {
  target: OrgUserRowJson
  onCancel: () => void
  onSaved: () => void
}) {
  const displayEmail = target.email ?? ''

  const [editName, setEditName] = useState(() => target.full_name ?? '')
  const [editCompany, setEditCompany] = useState(() => target.company_name ?? '')
  const [editPhone, setEditPhone] = useState(() => target.phone ?? '')
  const [editBio, setEditBio] = useState(() => target.bio ?? '')
  const [editRole, setEditRole] = useState<OrgInviteRole>(() => initialInviteRole(target))
  const [editBusy, setEditBusy] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  async function onEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)
    setEditBusy(true)
    const res = await updateTeamMemberProfile({
      targetUserId: target.id,
      full_name: editName.trim() || null,
      role: target.role === 'admin' ? 'client' : editRole,
      company_name: editCompany.trim() || null,
      phone: editPhone.trim() || null,
      bio: editBio.trim() || null,
    })
    setEditBusy(false)
    if (!res.ok) {
      setSubmitError(res.message)
      return
    }
    onSaved()
  }

  return (
    <form onSubmit={onEditSubmit} className="gap-block flex flex-col px-4 pb-4">
      <div className="gap-inset flex flex-col">
        <Label htmlFor="users-edit-email" className="text-foreground text-sm font-medium">
          Email
        </Label>
        <FormControlInput
          id="users-edit-email"
          type="email"
          readOnly
          value={displayEmail}
          aria-readonly="true"
        />
        <p className="text-muted-foreground text-xs leading-relaxed">
          Login email is managed in Supabase Auth. To change it for this user, use account recovery
          flows or a dedicated auth admin tool—not this form.
        </p>
      </div>

      <div className="gap-inset flex flex-col">
        <Label htmlFor="users-edit-name" className="text-foreground text-sm font-medium">
          Full name
        </Label>
        <FormControlInput
          id="users-edit-name"
          type="text"
          autoComplete="name"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
        />
      </div>

      <div className="gap-inset grid sm:grid-cols-2">
        <div className="gap-inset flex min-w-0 flex-col">
          <Label htmlFor="users-edit-company" className="text-foreground text-sm font-medium">
            Company
          </Label>
          <FormControlInput
            id="users-edit-company"
            type="text"
            autoComplete="organization"
            value={editCompany}
            onChange={(e) => setEditCompany(e.target.value)}
          />
        </div>
        <div className="gap-inset flex min-w-0 flex-col">
          <Label htmlFor="users-edit-phone" className="text-foreground text-sm font-medium">
            Phone
          </Label>
          <FormControlInput
            id="users-edit-phone"
            type="tel"
            autoComplete="tel"
            value={editPhone}
            onChange={(e) => setEditPhone(e.target.value)}
          />
        </div>
      </div>

      <div className="gap-inset flex min-w-0 flex-col">
        <Label htmlFor="users-edit-bio" className="text-foreground text-sm font-medium">
          Bio
        </Label>
        <FormControlTextarea
          id="users-edit-bio"
          value={editBio}
          onChange={(e) => setEditBio(e.target.value)}
          rows={4}
          placeholder="Short bio…"
        />
      </div>

      {target.role !== 'admin' ? (
        <div className="gap-inset flex flex-col">
          <Label htmlFor="users-edit-role" className="text-foreground text-sm font-medium">
            Role
          </Label>
          <SettingsRoleSelect id="users-edit-role" value={editRole} onChange={setEditRole} />
        </div>
      ) : (
        <p className="text-muted-foreground text-sm leading-relaxed">
          Role cannot be changed for the organization admin.
        </p>
      )}
      {submitError ? (
        <p className="text-destructive text-sm" role="alert">
          {submitError}
        </p>
      ) : null}
      <SheetFooter className="gap-block pt-block px-0 sm:flex-row">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="default" disabled={editBusy}>
          {editBusy ? 'Saving…' : 'Save changes'}
        </Button>
      </SheetFooter>
    </form>
  )
}

export function EditUserSheet({
  open,
  onOpenChange,
  target,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  target: OrgUserRowJson | null
  onSaved: () => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className={cn(SETTINGS_RIGHT_SHEET_CONTENT_CLASS)}>
        <SheetHeader>
          <SheetTitle>Edit profile</SheetTitle>
          <SheetDescription>
            Update profile fields stored on{' '}
            <code className="text-foreground bg-muted rounded px-1 py-0.5 text-xs">profiles</code>.
            {target?.role === 'admin' ? '' : ' You can change role for non-admin teammates.'}
          </SheetDescription>
        </SheetHeader>
        {target ? (
          <EditUserForm
            key={editUserFormKey(target)}
            target={target}
            onCancel={() => onOpenChange(false)}
            onSaved={() => {
              onOpenChange(false)
              onSaved()
            }}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
