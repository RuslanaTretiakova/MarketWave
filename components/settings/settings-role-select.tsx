'use client'

import { FormControlSelect } from '@/components/ui/form-control'
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
    <FormControlSelect
      id={id}
      value={value}
      disabled={disabled}
      onValueChange={(nextValue) => onChange(nextValue as OrgInviteRole)}
      options={ORG_INVITE_ROLE_OPTIONS.map((option) => ({
        value: option.value,
        label: option.label,
      }))}
    />
  )
}
