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
import { FormControlSelect, FormControlTextarea } from '@/components/ui/form-control'
import { Label } from '@/components/ui/label'
import {
  menuActionDialogContentClassName,
  menuActionDialogTitleClassName,
} from '@/components/ui/menu-action-dialog'
import { siteAdminTransitionMenuLabel } from '@/lib/sites/admin-site-transitions'
import type { SiteAdminTransition } from '@/lib/sites/site-actions'
import { changeSiteStatus } from '@/lib/sites/site-actions'
import type { Database } from '@/lib/supabase/types'

type SiteStatus = Database['public']['Enums']['site_status']

/** Shown when a transition is pre-selected (no picker). */
const DISCLAIMER: Record<SiteAdminTransition, string> = {
  needs_changes:
    'The sourcer will be asked to update this listing. The site status will change to Needs changes.',
  approve: 'This action approves and activates the listing for clients.',
  unarchive:
    'This site becomes visible to clients when Active (catalog eligibility applies). Confirm activation.',
  archive:
    'Archived sites are hidden from sourcers and managers. Clients cannot purchase placements.',
}

/** What each action does — shown under the status dropdown in picker mode. */
const TRANSITION_ACTION_GUIDE: Record<SiteAdminTransition, string> = {
  needs_changes:
    'Choose this when the listing is not ready to go live. The sourcer must address your feedback; the site moves to Needs changes until they revise and resubmit. You must leave a clear comment describing what to fix.',
  approve:
    'Choose this when the listing meets your bar. It becomes Active and can appear in the client catalog (subject to your other rules). Optional comment is not saved for this action.',
  unarchive:
    'Choose this to restore an archived site to Active so it can rejoin the catalog workflow. Confirm this is the correct site before continuing.',
  archive:
    'Choose this to remove the site from the market: it is hidden from sourcers and managers, and clients cannot purchase placements. You can unarchive later if the site should return.',
}

function statusChangeSuccessToast(transition: SiteAdminTransition, domain: string) {
  const opts = { description: domain }
  switch (transition) {
    case 'needs_changes':
      toast.success('Marked as needs changes', opts)
      break
    case 'approve':
      toast.success('Site approved and active', opts)
      break
    case 'archive':
      toast.success('Site archived', opts)
      break
    case 'unarchive':
      toast.success('Site unarchived', opts)
      break
    default:
      toast.success('Status updated', opts)
  }
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
  /** Pre-selected transition. When provided, no picker is shown. */
  transition?: SiteAdminTransition | null
  /** Available transitions to pick from. Shown when `transition` is not provided. */
  transitions?: SiteAdminTransition[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [picked, setPicked] = useState<SiteAdminTransition | null>(null)
  const [comment, setComment] = useState('')

  const activeTransition = transition ?? picked

  function handleOpenChange(next: boolean) {
    if (!next) {
      setPicked(null)
      setError(null)
      setComment('')
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

  const commentTrimmed = comment.trim()
  const commentRequired = activeTransition === 'needs_changes'
  const canSubmit = Boolean(activeTransition) && (!commentRequired || commentTrimmed.length > 0)

  function submit() {
    if (!activeTransition) return
    if (commentRequired && !commentTrimmed) {
      setError('Please add a comment explaining what needs to change.')
      return
    }
    setError(null)
    startTransition(async () => {
      const res = await changeSiteStatus({
        siteId,
        transition: activeTransition,
        comment: commentTrimmed || null,
      })
      if (!res.ok) {
        setError(res.message)
        toast.error(res.message)
        return
      }
      statusChangeSuccessToast(activeTransition, domainLabel)
      handleOpenChange(false)
      router.refresh()
    })
  }

  const description = (
    <>
      <span className="block">
        <strong className="text-foreground">{domainLabel}</strong>
      </span>
      {showPicker ? (
        <span className="text-muted-foreground mt-2 block text-sm leading-relaxed">
          Pick the next step from the list, read what it does below, add a comment if required, then
          confirm.
        </span>
      ) : activeTransition ? (
        <span className="mt-2 block text-sm leading-relaxed">{DISCLAIMER[activeTransition]}</span>
      ) : null}
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
          <div className="gap-inset flex flex-col">
            <Label htmlFor="site-status-transition">Action</Label>
            <FormControlSelect
              id="site-status-transition"
              value={picked ?? undefined}
              onValueChange={(v) => {
                setPicked(v as SiteAdminTransition)
                setError(null)
              }}
              placeholder="Choose an action…"
              options={transitions!.map((t) => ({
                value: t,
                label: siteAdminTransitionMenuLabel(t),
              }))}
              disabled={pending}
            />
            <div
              className="text-muted-foreground border-border bg-muted/30 rounded-xl border px-3 py-2.5 text-xs leading-relaxed"
              role="note"
            >
              {picked ? (
                TRANSITION_ACTION_GUIDE[picked]
              ) : (
                <>
                  Select an action to see{' '}
                  <span className="text-foreground font-medium">what it does</span>, whether a
                  comment is required, and what happens after you confirm.
                </>
              )}
            </div>
          </div>
        ) : null}

        {activeTransition ? (
          <div className="gap-inset flex flex-col">
            <Label htmlFor="site-status-comment">
              Comment{commentRequired ? ' (required)' : ' (optional)'}
            </Label>
            <FormControlTextarea
              id="site-status-comment"
              rows={4}
              value={comment}
              onChange={(e) => {
                setComment(e.target.value)
                if (error) setError(null)
              }}
              disabled={pending}
              placeholder={
                commentRequired
                  ? 'Describe what the sourcer should fix or update…'
                  : 'Add context for your team (optional)…'
              }
            />
            {commentRequired ? (
              <p className="text-muted-foreground text-xs">
                A comment is required so the sourcer knows what to change.
              </p>
            ) : null}
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
          <Button type="button" variant="cta" disabled={pending || !canSubmit} onClick={submit}>
            {pending ? 'Confirming…' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
