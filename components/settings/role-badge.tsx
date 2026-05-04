'use client'

import type { OrgUserRole } from '@/lib/org-users/types'
import { cn } from '@/lib/utils'

export const ROLE_LABEL: Record<OrgUserRole, string> = {
  admin: 'Admin',
  client: 'Client',
  manager: 'Manager',
  sourcer: 'Sourcer',
  copywriter: 'Copywriter',
}

const ROLE_CHIP_CLASS: Record<OrgUserRole, string> = {
  admin: 'bg-foreground text-background border-transparent',
  manager:
    'bg-teal-500/12 text-teal-900 border-teal-600/25 dark:text-teal-100 dark:border-teal-500/30',
  sourcer:
    'bg-orange-500/12 text-orange-950 border-orange-600/20 dark:text-orange-100 dark:border-orange-500/25',
  copywriter:
    'bg-amber-400/15 text-amber-950 border-amber-600/25 dark:text-amber-50 dark:border-amber-500/25',
  client: 'bg-muted text-foreground border-border',
}

export function RoleBadge({ role, className }: { role: OrgUserRole; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium',
        ROLE_CHIP_CLASS[role],
        className
      )}
    >
      {ROLE_LABEL[role]}
    </span>
  )
}
