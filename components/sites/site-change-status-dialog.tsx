'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
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
import {
  menuActionDialogContentClassName,
  menuActionDialogTitleClassName,
} from '@/components/ui/menu-action-dialog'
import { siteAdminTransitionMenuLabel } from '@/lib/sites/admin-site-transitions'
import type { SiteAdminTransition } from '@/lib/sites/site-actions'
import { changeSiteStatus } from '@/lib/sites/site-actions'
import type { Database } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

type SiteStatus = Database['public']['Enums']['site_status']

const DISCLAIMER: Record<SiteAdminTransition, string> = {
  needs_changes:
    'The sourcer will be asked to update this listing. The site status will change to Needs changes.',
  approve: 'This action approves and activates the listing for clients.',
  unarchive:
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
  transitions,
}: {
  siteId: string
  domainLabel: string
  currentStatus?: SiteStatus
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pre-selected transition (catalog path). When provided, no picker is shown. */
  transition?: SiteAdminTransition | null
  /** Available transitions to pick from (toolbar path). Shown when `transition` is not provided. */
  transitions?: SiteAdminTransition[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [picked, setPicked] = useState<SiteAdminTransition | null>(null)

  const activeTransition = transition ?? picked

  function handleOpenChange(next: boolean) {
    if (!next) {
      setPicked(null)
      setError(null)
    }
    onOpenChange(next)
  }

  const title = useMemo(() => {
    if (!activeTransition) return 'Change status'
    switch (activeTransition) {
      case 'needs_changes':
        return 'Needs changes'
      case 'approve':
        return 'Approve site'
      case 'unarchive':
        return 'Activate site'
      case 'archive':
        return 'Archive site'
      default:
        return 'Change status'
    }
  }, [activeTransition])

  const showPicker = !transition && transitions && transitions.length > 0

  function submit() {
    if (!activeTransition) return
    setError(null)
    startTransition(async () => {
      const res = await changeSiteStatus({ siteId, transition: activeTransition })
      if (!res.ok) {
        setError(res.message)
        toast.error(res.message)
        return
      }
      toast.success('Status updated.')
      handleOpenChange(false)
      router.refresh()
    })
  }

  const description = (
    <>
      <span className="block">
        <strong className="text-foreground">{domainLabel}</strong>
      </span>
      {activeTransition ? <span className="mt-2 block">{DISCLAIMER[activeTransition]}</span> : null}
    </>
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={!pending}
        aria-describedby="site-status-disclaimer"
        className={menuActionDialogContentClassName}
      >
        <DialogHeader className="gap-2">
          <DialogTitle className={menuActionDialogTitleClassName}>{title}</DialogTitle>
          <DialogDescription id="site-status-disclaimer">{description}</DialogDescription>
        </DialogHeader>

        {showPicker ? (
          <div className="flex flex-col gap-2">
            {transitions!.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setPicked(t)}
                className={cn(
                  'rounded-lg border px-4 py-2.5 text-left text-sm transition-colors',
                  picked === t
                    ? 'border-foreground bg-foreground/5 font-medium'
                    : 'border-border hover:bg-muted'
                )}
              >
                {siteAdminTransitionMenuLabel(t)}
              </button>
            ))}
          </div>
        ) : null}

        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="cta"
            disabled={pending || !activeTransition}
            onClick={submit}
          >
            {pending ? 'Confirming…' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
