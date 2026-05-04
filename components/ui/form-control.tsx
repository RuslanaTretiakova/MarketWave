import * as React from 'react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/**
 * Canonical in-app form chrome: 40px height (`h-10`), pill inputs, full width.
 * Use `FormControlInput` / `FormControlTextarea`; use class constants when composing selects or icon slots.
 */
export const formControlInputClassName = cn(
  'border-border/70 bg-muted/40 placeholder:text-muted-foreground',
  'focus-visible:border-ring focus-visible:ring-ring/50',
  'h-10 w-full min-w-0 rounded-full border px-4 text-sm outline-none transition-colors',
  'focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-70 md:text-sm'
)

export const formControlSelectClassName = cn(formControlInputClassName, 'cursor-pointer pr-10')

export function formControlTextareaClassName(extra?: string) {
  return cn(
    formControlInputClassName,
    'block h-auto min-h-[7.5rem] resize-y rounded-2xl py-3 leading-relaxed',
    extra
  )
}

export function FormControlInput({ className, ...props }: React.ComponentProps<typeof Input>) {
  return <Input className={cn(formControlInputClassName, className)} {...props} />
}

export const FormControlTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<'textarea'>
>(function FormControlTextarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      data-slot="form-control-textarea"
      className={cn(formControlTextareaClassName(), className)}
      {...props}
    />
  )
})
