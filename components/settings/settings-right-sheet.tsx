'use client'

import * as React from 'react'

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

/** Shared layout for right-side settings panels (invite, edit, mobile detail). */
export const SETTINGS_RIGHT_SHEET_CONTENT_CLASS = 'gap-0 sm:max-w-md flex min-h-0 flex-col'

type SettingsRightSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  /** Merged into SheetFooter (e.g. `flex-col items-stretch sm:flex-col` for stacked actions). */
  footerClassName?: string
  /** Merged into SheetContent after the shared layout class. */
  contentClassName?: string
}

export function SettingsRightSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  footerClassName,
  contentClassName,
}: SettingsRightSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(SETTINGS_RIGHT_SHEET_CONTENT_CLASS, contentClassName)}
      >
        <SheetHeader className="shrink-0 text-left">
          <SheetTitle>{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>
        <div className="gap-block flex min-h-0 flex-1 flex-col overflow-y-auto px-4">
          {children}
        </div>
        {footer ? (
          <SheetFooter
            className={cn(
              'gap-block pt-block shrink-0 px-4 pb-4',
              footerClassName ?? 'sm:flex-row'
            )}
          >
            {footer}
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
