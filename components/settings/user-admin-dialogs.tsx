'use client'

import type { OrgUserRowJson } from '@/lib/org-users/types'
import { splitDisplayName } from '@/lib/user-display-name'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FormControlSelect } from '@/components/ui/form-control'
import { Label } from '@/components/ui/label'

export type AdminDisableDialogState =
  | null
  | { row: OrgUserRowJson; mode: 'simple' }
  | { row: OrgUserRowJson; mode: 'sourcer'; sitesAssigned: number }
  | {
      row: OrgUserRowJson
      mode: 'reassign'
      activeOrders: number
      replacementId: string
    }

export function adminUserDisplayName(row: OrgUserRowJson): string {
  const email = row.email ?? ''
  const { first, last } = splitDisplayName(row.full_name, email)
  const combined = [first, last].filter(Boolean).join(' ')
  return combined.trim() || email || 'User'
}

export function AdminUserDisableDialog({
  state,
  busy,
  copywriterReplacementOptions,
  onOpenChange,
  onReplacementChange,
  onConfirm,
}: {
  state: AdminDisableDialogState
  busy: boolean
  copywriterReplacementOptions: OrgUserRowJson[]
  onOpenChange: (open: boolean) => void
  onReplacementChange: (replacementId: string) => void
  onConfirm: () => void
}) {
  return (
    <Dialog open={!!state} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={!busy}>
        <DialogHeader>
          <DialogTitle>Disable user</DialogTitle>
          <DialogDescription className="space-y-2">
            {state?.mode === 'simple' ? (
              <span>
                This account will be disabled and will no longer be able to sign in until an admin
                activates it again.
              </span>
            ) : null}
            {state?.mode === 'sourcer' ? (
              <span>
                This sourcer has <strong className="text-foreground">{state.sitesAssigned}</strong>{' '}
                assigned site
                {state.sitesAssigned === 1 ? '' : 's'}. Those assignments will be cleared, then the
                account will be disabled.
              </span>
            ) : null}
            {state?.mode === 'reassign' ? (
              <>
                <span>
                  This copywriter has{' '}
                  <strong className="text-foreground">{state.activeOrders}</strong> active order
                  {state.activeOrders === 1 ? '' : 's'}. Reassign them before disabling.
                </span>
                <div className="space-y-inset pt-2">
                  <Label htmlFor="admin-disable-reassign-copywriter">Assign orders to</Label>
                  <FormControlSelect
                    id="admin-disable-reassign-copywriter"
                    value={state.replacementId}
                    onValueChange={onReplacementChange}
                    options={[
                      { value: '', label: 'Select copywriter…' },
                      ...copywriterReplacementOptions.map((r) => ({
                        value: r.id,
                        label: `${adminUserDisplayName(r)} (${r.email ?? r.id})`,
                      })),
                    ]}
                    triggerClassName="h-9 rounded-md"
                  />
                  {copywriterReplacementOptions.length === 0 ? (
                    <p className="text-destructive text-xs">
                      Add another active copywriter before disabling this user.
                    </p>
                  ) : null}
                </div>
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={
              busy ||
              (state?.mode === 'reassign' &&
                (!state.replacementId || copywriterReplacementOptions.length === 0))
            }
            onClick={onConfirm}
          >
            {busy ? 'Disabling…' : 'Confirm disable'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function AdminUserActivateDialog({
  open,
  busy,
  displayName,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  busy: boolean
  displayName: string
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={!busy}>
        <DialogHeader>
          <DialogTitle>Activate user</DialogTitle>
          <DialogDescription>
            Restore access for <strong className="text-foreground">{displayName}</strong>? They will
            be able to sign in again.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" variant="cta" disabled={busy} onClick={onConfirm}>
            {busy ? 'Activating…' : 'Activate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function AdminUserResendInviteDialog({
  open,
  busy,
  email,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  busy: boolean
  email: string
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={!busy}>
        <DialogHeader>
          <DialogTitle>Resend invitation</DialogTitle>
          <DialogDescription>
            Send another invitation email to <strong className="text-foreground">{email}</strong>?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" variant="cta" disabled={busy} onClick={onConfirm}>
            {busy ? 'Sending…' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
