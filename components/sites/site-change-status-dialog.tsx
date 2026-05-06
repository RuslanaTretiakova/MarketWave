'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { SiteAdminTransition } from '@/lib/sites/site-actions'
import { changeSiteStatus } from '@/lib/sites/site-actions'
const DISCLAIMER: Record<SiteAdminTransition, string> = {
  needs_changes:
    'The sourcer will be asked to update this listing. The site status will change to Needs changes.',
  approve: 'Mark this listing as approved before activating it for clients.',
  activate:
    'This site becomes visible to clients when Active (catalog eligibility applies). Confirm activation.',
  archive:
    'Archived sites are hidden from sourcers and managers. Clients cannot purchase placements.',
}

export function SiteChangeStatusDialog({
  siteId,
  domainLabel,
  open,
  onOpenChange,
  transition,
}: {
  siteId: string
  domainLabel: string
  open: boolean
  onOpenChange: (open: boolean) => void
  transition: SiteAdminTransition | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const title = useMemo(() => {
    if (!transition) return 'Change status'
    switch (transition) {
      case 'needs_changes':
        return 'Request changes'
      case 'approve':
        return 'Approve site'
      case 'activate':
        return 'Activate site'
      case 'archive':
        return 'Archive site'
      default:
        return 'Change status'
    }
  }, [transition])

  const disclaimer = transition === null ? 'Pick an action from the menu.' : DISCLAIMER[transition]

  const submit = useCallback(() => {
    if (!transition) return
    setError(null)
    startTransition(async () => {
      const res = await changeSiteStatus({ siteId, transition })
      if (!res.ok) {
        setError(res.message)
        toast.error(res.message)
        return
      }
      toast.success('Status updated.')
      onOpenChange(false)
      router.refresh()
    })
  }, [transition, siteId, onOpenChange, router])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="site-status-disclaimer">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription id="site-status-disclaimer">
            <span className="text-foreground font-medium">{domainLabel}</span>
            <span className="mt-2 block">{disclaimer}</span>
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
        <DialogFooter className="gap-inset">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="cta"
            disabled={pending || transition === null}
            onClick={submit}
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
