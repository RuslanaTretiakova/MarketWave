'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ShoppingCart, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { SiteChangeStatusDialog } from '@/components/sites/site-change-status-dialog'
import { Button, buttonVariants } from '@/components/ui/button'
import { removeFromCartBySiteId } from '@/lib/cart/cart-actions'
import { siteAdminTransitions } from '@/lib/sites/admin-site-transitions'
import { addSiteToCart } from '@/lib/sites/site-actions'
import type { Database } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

type Role = Database['public']['Enums']['user_role']
type SiteStatus = Database['public']['Enums']['site_status']

export function SiteDetailToolbar({
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
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [justAddedSiteId, setJustAddedSiteId] = useState<string | null>(null)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)

  const canEdit =
    role === 'admin' || (role === 'sourcer' && sourcerId === userId && status !== 'archived')

  const canCart = role === 'client' && status === 'active'

  const inCart = siteInCart || justAddedSiteId === siteId

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

      <div className="gap-block mb-layout flex flex-wrap items-center">
        {role === 'sourcer' || role === 'admin' || role === 'manager' ? (
          <Link
            href="/sites"
            className={cn(
              buttonVariants({ variant: 'outline', size: 'default' }),
              'h-10 min-h-10 justify-center rounded-full'
            )}
          >
            All sites
          </Link>
        ) : null}
        {canCart ? (
          inCart ? (
            <Button
              type="button"
              variant="outline"
              className="h-10 min-h-10 justify-center gap-2 rounded-full"
              disabled={removing}
              onClick={removeFromCart}
              aria-label={`Remove ${domain} from cart`}
            >
              <Trash2 className="size-4" aria-hidden />
              {removing ? 'Removing…' : 'Remove from cart'}
            </Button>
          ) : (
            <Button
              type="button"
              variant="cta"
              className="h-10 min-h-10 justify-center gap-2 rounded-full"
              disabled={adding}
              onClick={addCart}
              aria-label={adding ? `Adding ${domain} to cart` : `Add ${domain} to cart`}
            >
              <ShoppingCart className="size-4" aria-hidden />
              {adding ? 'Adding…' : 'Add to cart'}
            </Button>
          )
        ) : null}
        {canEdit ? (
          <Link
            href={`/sites/${siteId}/edit`}
            className={cn(
              buttonVariants({ variant: 'outline', size: 'default' }),
              'h-10 min-h-10 justify-center rounded-full'
            )}
          >
            Edit
          </Link>
        ) : null}
        {role === 'admin' || role === 'manager' ? (
          <Button
            type="button"
            variant="outline"
            className="h-10 min-h-10 justify-center rounded-full"
            onClick={() => setStatusDialogOpen(true)}
          >
            Change status
          </Button>
        ) : null}
      </div>
    </>
  )
}
