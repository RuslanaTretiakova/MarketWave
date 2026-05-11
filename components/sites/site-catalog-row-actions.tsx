'use client'

import { useRouter } from 'next/navigation'
import { Eye, Pencil, ShieldCheck, ShoppingCart, Trash2 } from 'lucide-react'

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
import type { SiteCatalogRow } from '@/lib/sites/load-sites-catalog'

export function SiteCatalogRowActions({
  row,
  canUseCart,
  canAdminStatus,
  cartSiteIdSet,
  addingSiteId,
  removingSiteId,
  addCart,
  removeFromCart,
  editAllowed,
  onOpenChangeStatus,
}: {
  row: SiteCatalogRow
  canUseCart: boolean
  canAdminStatus: boolean
  cartSiteIdSet: Set<string>
  addingSiteId: string | null
  removingSiteId: string | null
  addCart: (siteId: string, domain: string, onSuccess?: () => void) => void
  removeFromCart: (siteId: string, domain: string, onSuccess?: () => void) => void
  editAllowed: boolean
  onOpenChangeStatus: (row: SiteCatalogRow) => void
}) {
  const router = useRouter()
  const transitions = siteAdminTransitions(row.status)
  const showChangeStatus = canAdminStatus && transitions.length > 0

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<TableRowActionsTrigger label={`Manage ${row.domain}`} />} />
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
            Manage
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
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
          {canUseCart && cartSiteIdSet.has(row.id) ? (
            <DropdownMenuItem
              className="gap-2"
              disabled={removingSiteId === row.id}
              onClick={() => removeFromCart(row.id, row.domain)}
            >
              <Trash2 className="size-4" aria-hidden />
              {removingSiteId === row.id ? 'Removing…' : 'Remove from cart'}
            </DropdownMenuItem>
          ) : canUseCart ? (
            <DropdownMenuItem
              className="gap-2"
              disabled={row.status !== 'active' || addingSiteId === row.id}
              onClick={() => addCart(row.id, row.domain)}
            >
              <ShoppingCart className="size-4" aria-hidden />
              {addingSiteId === row.id ? 'Adding…' : 'Add to cart'}
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
