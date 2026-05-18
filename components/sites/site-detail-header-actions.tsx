'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { Eye, Pencil, ShieldCheck, ShoppingCart, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { SiteChangeStatusDialog } from '@/components/sites/site-change-status-dialog'
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
import { removeFromCartBySiteId } from '@/lib/cart/cart-actions'
import { siteAdminTransitions } from '@/lib/sites/admin-site-transitions'
import { addSiteToCart } from '@/lib/sites/site-actions'
import type { Database } from '@/lib/supabase/types'

type Role = Database['public']['Enums']['user_role']
type SiteStatus = Database['public']['Enums']['site_status']

export function SiteDetailHeaderActions({
  role,
  userId,
  siteId,
  domain,
  status,
  sourcerId,
  siteInCart,
}: {
  role: Role
  userId: string
  siteId: string
  domain: string
  status: SiteStatus
  sourcerId: string | null
  siteInCart: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()
  const isEditRoute = (pathname.split('?')[0] ?? pathname).endsWith('/edit')
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [justAddedSiteId, setJustAddedSiteId] = useState<string | null>(null)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)

  const canEdit =
    role === 'admin' || (role === 'sourcer' && sourcerId === userId && status !== 'archived')

  const canCart = role === 'client' && status === 'active'

  const inCart = siteInCart || justAddedSiteId === siteId

  const canAdminStatus = role === 'admin'
  const showChangeStatus = canAdminStatus && siteAdminTransitions(status).length > 0

  const hasStaffActions = (canEdit && !isEditRoute) || (canEdit && isEditRoute) || showChangeStatus

  const addCart = () => {
    if (inCart || adding) return
    setAdding(true)
    void (async () => {
      try {
        const res = await addSiteToCart(siteId)
        if (!res.ok) {
          toast.error(res.message)
          return
        }
        toast.success('Added to cart', { description: domain })
        setJustAddedSiteId(siteId)
        router.refresh()
      } finally {
        setAdding(false)
      }
    })()
  }

  const removeFromCart = () => {
    if (!inCart || removing || adding) return
    setRemoving(true)
    void (async () => {
      try {
        const res = await removeFromCartBySiteId(siteId)
        if (!res.ok) {
          toast.error(res.message)
          return
        }
        toast.success('Removed from cart', { description: domain })
        setJustAddedSiteId(null)
        router.refresh()
      } finally {
        setRemoving(false)
      }
    })()
  }

  return (
    <>
      <SiteChangeStatusDialog
        siteId={siteId}
        domainLabel={domain}
        currentStatus={status}
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        transitions={siteAdminTransitions(status)}
      />

      <div className="shrink-0" data-row-actions>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<TableRowActionsTrigger label={`Actions for ${domain}`} />}
          />
          <DropdownMenuContent align="end" className="min-w-48">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
                Site
              </DropdownMenuLabel>
              {canEdit && !isEditRoute ? (
                <DropdownMenuItem
                  className="gap-2"
                  onClick={() => router.push(`/sites/${siteId}/edit`)}
                >
                  <Pencil className="size-4" aria-hidden />
                  Edit
                </DropdownMenuItem>
              ) : null}
              {canEdit && isEditRoute ? (
                <DropdownMenuItem className="gap-2" onClick={() => router.push(`/sites/${siteId}`)}>
                  <Eye className="size-4" aria-hidden />
                  View listing
                </DropdownMenuItem>
              ) : null}
              {showChangeStatus ? (
                <DropdownMenuItem className="gap-2" onClick={() => setStatusDialogOpen(true)}>
                  <ShieldCheck className="size-4" aria-hidden />
                  Change status
                </DropdownMenuItem>
              ) : null}
              {canCart && hasStaffActions ? <DropdownMenuSeparator /> : null}
              {canCart ? (
                <>
                  {inCart ? (
                    <DropdownMenuItem
                      className="gap-2"
                      disabled={removing}
                      onClick={removeFromCart}
                    >
                      <Trash2 className="size-4" aria-hidden />
                      {removing ? 'Removing…' : 'Remove from cart'}
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem className="gap-2" disabled={adding} onClick={addCart}>
                      <ShoppingCart className="size-4" aria-hidden />
                      {adding ? 'Adding…' : 'Add to cart'}
                    </DropdownMenuItem>
                  )}
                </>
              ) : null}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  )
}
