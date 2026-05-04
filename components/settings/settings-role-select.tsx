'use client'

import { formControlSelectClassName } from '@/components/ui/form-control'
import type { OrgInviteRole } from '@/lib/org-users/org-invite-roles'
import { ORG_INVITE_ROLE_OPTIONS } from '@/lib/org-users/org-invite-roles'

export function SettingsRoleSelect({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string
  value: OrgInviteRole
  onChange: (value: OrgInviteRole) => void
  disabled?: boolean
}) {
  return (
    <select
      id={id}
      disabled={disabled}
      className={formControlSelectClassName}
      value={value}
      onChange={(e) => onChange(e.target.value as OrgInviteRole)}
    >
      {ORG_INVITE_ROLE_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
