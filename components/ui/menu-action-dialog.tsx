'use client'

import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

/** Shared chrome for menu-driven confirmation / action modals (padding, radius, gap). */
export const menuActionDialogContentClassName =
  'w-[calc(100vw-2rem)] max-w-md gap-6 rounded-3xl p-8 sm:w-full'

export const menuActionDialogTitleClassName =
  'font-heading text-foreground text-xl leading-tight font-bold sm:text-xl'

export type MenuActionDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description?: ReactNode
  /** Extra content between description and footer (forms, pickers). */
  middle?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  confirmVariant?: 'cta' | 'destructive'
  busy?: boolean
  confirmDisabled?: boolean
  onConfirm: () => void
  onCancel?: () => void
  contentClassName?: string
  footerClassName?: string
  headerClassName?: string
}

export function MenuActionDialog({
  open,
  onOpenChange,
  title,
  description,
  middle,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'cta',
  busy = false,
  confirmDisabled = false,
  onConfirm,
  onCancel,
  contentClassName,
  footerClassName,
  headerClassName,
}: MenuActionDialogProps) {
  function handleCancel() {
    if (busy) return
    if (onCancel) {
      onCancel()
      return
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={!busy}
        className={cn(menuActionDialogContentClassName, contentClassName)}
      >
        <DialogHeader className={cn('gap-2', headerClassName)}>
          <DialogTitle className={menuActionDialogTitleClassName}>{title}</DialogTitle>
          {description != null ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {middle}
        <DialogFooter className={cn('gap-2 sm:gap-3', footerClassName)}>
          <Button type="button" variant="outline" disabled={busy} onClick={handleCancel}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={confirmVariant}
            disabled={busy || confirmDisabled}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
