'use client'

import { FormControlSelect } from '@/components/ui/form-control'
import type { OrgInviteRole } from '@/lib/org-users/org-invite-roles'
import { ORG_INVITE_ROLE_OPTIONS } from '@/lib/org-users/org-invite-roles'

export function SettingsRoleSelect({
  id,
  value,
  onChange,
  disabled,
  excludeRoles,
}: {
  id: string
  value: OrgInviteRole
  onChange: (value: OrgInviteRole) => void
  disabled?: boolean
  excludeRoles?: OrgInviteRole[]
}) {
  const options = (
    excludeRoles?.length
      ? ORG_INVITE_ROLE_OPTIONS.filter((o) => !excludeRoles.includes(o.value))
      : ORG_INVITE_ROLE_OPTIONS
  ).map((o) => ({ value: o.value, label: o.label }))

  return (
    <FormControlSelect
      id={id}
      value={value}
      disabled={disabled}
      onValueChange={(nextValue) => onChange(nextValue as OrgInviteRole)}
      options={options}
    />
  )
}
