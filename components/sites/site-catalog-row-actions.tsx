'use client'

import { useRouter } from 'next/navigation'
import { Eye, Pencil, ShieldCheck } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TableRowActionsTrigger } from '@/components/ui/table-row-actions-trigger'
import { siteAdminTransitions } from '@/lib/sites/admin-site-transitions'
import { SITE_STATUS_CHIP, SITE_STATUS_LABEL } from '@/lib/sites/site-status-labels'
import type { SiteCatalogRow } from '@/lib/sites/load-sites-catalog'
import { cn } from '@/lib/utils'

export function SiteCatalogRowActions({
  row,
  role,
  canAdminStatus,
  editAllowed,
  onOpenChangeStatus,
}: {
  row: SiteCatalogRow
  role: 'admin' | 'sourcer' | 'manager' | 'client' | 'copywriter'
  canAdminStatus: boolean
  editAllowed: boolean
  onOpenChangeStatus: (row: SiteCatalogRow) => void
}) {
  const router = useRouter()
  const transitions = siteAdminTransitions(row.status)
  const showChangeStatus = canAdminStatus && transitions.length > 0
  const canSeeStatus = role === 'admin' || role === 'sourcer'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<TableRowActionsTrigger label={`Manage ${row.domain}`} />} />
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
            Manage
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {canSeeStatus ? (
            <div className="px-2 py-1.5">
              <span
                className={cn(
                  'inline-flex min-h-6 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
                  SITE_STATUS_CHIP[row.status]
                )}
              >
                <span className="size-1.5 rounded-full bg-current opacity-70" aria-hidden />
                {SITE_STATUS_LABEL[row.status]}
              </span>
            </div>
          ) : null}
          <DropdownMenuItem className="gap-2" onClick={() => router.push(`/sites/${row.id}`)}>
            <Eye className="size-4" aria-hidden />
            View
          </DropdownMenuItem>
          {editAllowed ? (
            <DropdownMenuItem
              className="gap-2"
              onClick={() => router.push(`/sites/${row.id}/edit`)}
            >
              <Pencil className="size-4" aria-hidden />
              Edit
            </DropdownMenuItem>
          ) : null}
          {showChangeStatus ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2" onClick={() => onOpenChangeStatus(row)}>
                <ShieldCheck className="size-4" aria-hidden />
                Change status
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
