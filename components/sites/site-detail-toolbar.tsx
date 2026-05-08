'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { ShoppingCart } from 'lucide-react'
import { toast } from 'sonner'

import { SiteChangeStatusDialog } from '@/components/sites/site-change-status-dialog'
import { Button, buttonVariants } from '@/components/ui/button'
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
}: {
  role: Role
  userId: string
  siteId: string
  domain: string
  status: SiteStatus
  sourcerId: string | null
}) {
  const [pending, startTransition] = useTransition()
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)

  const canEdit =
    role === 'admin' || (role === 'sourcer' && sourcerId === userId && status !== 'archived')

  const canCart = role === 'client' && status === 'active'

  const addCart = () => {
    startTransition(async () => {
      const res = await addSiteToCart(siteId)
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      toast.success(`${domain} added to cart.`)
    })
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
          <Button
            type="button"
            variant="cta"
            className="h-10 min-h-10 justify-center gap-2 rounded-full"
            disabled={pending}
            onClick={addCart}
          >
            <ShoppingCart className="size-4" aria-hidden />
            Add to cart
          </Button>
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
