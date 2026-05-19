'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { SettingsRightSheet } from '@/components/settings/settings-right-sheet'
import { Button } from '@/components/ui/button'
import { FormControlSelect, FormControlTextarea } from '@/components/ui/form-control'
import { Label } from '@/components/ui/label'
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
          Select a new status and confirm.
        </span>
      ) : activeTransition ? (
        <span className="mt-2 block text-sm leading-relaxed">{DISCLAIMER[activeTransition]}</span>
      ) : null}
    </>
  )

  return (
    <SettingsRightSheet
      open={open}
      onOpenChange={handleOpenChange}
      title={title}
      description={description}
      footer={
        <>
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
        </>
      }
    >
      {showPicker ? (
        <div className="gap-inset flex flex-col">
          <Label htmlFor="site-status-transition">Select Status</Label>
          <FormControlSelect
            id="site-status-transition"
            value={picked ?? ''}
            onValueChange={(v) => {
              setPicked(v as SiteAdminTransition)
              setError(null)
            }}
            placeholder="Choose a status…"
            options={transitions!.map((t) => ({
              value: t,
              label: siteAdminTransitionMenuLabel(t),
            }))}
            disabled={pending}
          />
        </div>
      ) : null}

      <div className="gap-inset flex flex-col">
        <Label htmlFor="site-status-comment">
          Comment{commentRequired ? <span className="text-destructive"> *</span> : null}
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
      </div>

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
    </SettingsRightSheet>
  )
}
