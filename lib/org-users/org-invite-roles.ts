import type { Database } from '@/lib/supabase/types'

export type OrgInviteRole = Exclude<Database['public']['Enums']['user_role'], 'admin'>

export const ORG_INVITE_ROLE_OPTIONS: { value: OrgInviteRole; label: string }[] = [
  { value: 'client', label: 'Client' },
  { value: 'manager', label: 'Manager' },
  { value: 'sourcer', label: 'Sourcer' },
  { value: 'copywriter', label: 'Copywriter' },
]

export const ORG_INVITABLE_ROLE_VALUES: OrgInviteRole[] = ORG_INVITE_ROLE_OPTIONS.map(
  (o) => o.value
)

export const ORG_INVITABLE_ROLES: OrgInviteRole[] = [...ORG_INVITABLE_ROLE_VALUES]

export const ORG_MANAGER_INVITE_ROLE_OPTIONS: { value: OrgInviteRole; label: string }[] =
  ORG_INVITE_ROLE_OPTIONS.filter((o) => o.value !== 'manager')
