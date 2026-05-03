import type * as React from 'react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

/** Shared auth form input chrome (soft surface, comfortable tap target). */
export const authInputClassName = cn(
  'bg-muted border-border/60 h-10 rounded-xl border px-3 py-2 md:h-10 md:text-sm',
  'placeholder:text-muted-foreground',
  'focus-visible:border-ring focus-visible:ring-ring/50',
  'dark:bg-input/40 dark:border-input'
)

type AuthTextFieldProps = Omit<React.ComponentProps<typeof Input>, 'className'> & {
  label: string
  labelId: string
  errorId?: string
  error?: string | null
  /** Renders on the same row as the label (e.g. Forgot password link). */
  labelAccessory?: React.ReactNode
  className?: string
}

export function AuthTextField({
  label,
  labelId,
  errorId,
  error,
  labelAccessory,
  className,
  ...inputProps
}: AuthTextFieldProps) {
  return (
    <div className="space-y-inset">
      <div className="gap-inset flex min-h-5 items-center justify-between">
        <Label htmlFor={labelId} className="text-foreground text-sm font-semibold">
          {label}
        </Label>
        {labelAccessory ?? null}
      </div>
      <Input
        id={labelId}
        className={cn(authInputClassName, className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...inputProps}
      />
      {error && errorId ? (
        <p id={errorId} className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
