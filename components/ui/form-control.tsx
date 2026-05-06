import * as React from 'react'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
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

export const formControlSelectTriggerClassName = cn(
  'border-border/70 bg-muted/40 placeholder:text-muted-foreground',
  'focus-visible:border-ring focus-visible:ring-ring/50',
  'h-10 w-full min-w-0 rounded-full border px-4 text-sm outline-none transition-colors',
  'focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-70 md:text-sm',
  'justify-between gap-2 pr-3 data-[size=default]:h-10'
)

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

export type FormControlSelectOption = {
  value: string
  label: React.ReactNode
}

export function FormControlSelect({
  id,
  value,
  onValueChange,
  options,
  placeholder,
  triggerClassName,
  contentClassName,
  disabled,
  name,
}: {
  id?: string
  value?: string
  onValueChange: (value: string) => void
  options: FormControlSelectOption[]
  placeholder?: string
  triggerClassName?: string
  contentClassName?: string
  disabled?: boolean
  name?: string
}) {
  const handleValueChange = React.useCallback(
    (nextValue: string | null) => {
      if (nextValue !== null) {
        onValueChange(nextValue)
      }
    },
    [onValueChange]
  )

  return (
    <Select value={value} onValueChange={handleValueChange} disabled={disabled} name={name}>
      <SelectTrigger id={id} className={cn(formControlSelectTriggerClassName, triggerClassName)}>
        <SelectValue placeholder={placeholder ?? 'Select an option'} />
      </SelectTrigger>
      <SelectContent className={contentClassName}>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export const FormControlTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<typeof Textarea>
>(function FormControlTextarea({ className, ...props }, ref) {
  return (
    <Textarea
      ref={ref}
      data-slot="form-control-textarea"
      className={cn(formControlTextareaClassName(), className)}
      {...props}
    />
  )
})
