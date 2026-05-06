'use client'

import { Check, Circle } from 'lucide-react'

import { AUTH_MIN_PASSWORD_LENGTH } from '@/lib/auth/password-min'
import { confirmMatches, meetsMinLength, trimPasswordInput } from '@/lib/auth/password-validation'
import { cn } from '@/lib/utils'

type PasswordRequirementsHintProps = {
  password: string
  confirm: string
  className?: string
}

export function PasswordRequirementsHint({
  password,
  confirm,
  className,
}: PasswordRequirementsHintProps) {
  const trimmedPassword = trimPasswordInput(password)
  const trimmedConfirm = trimPasswordInput(confirm)
  const lengthOk = meetsMinLength(trimmedPassword)
  const showMatchRow = trimmedConfirm.length > 0
  const matchOk = showMatchRow && confirmMatches(trimmedPassword, trimmedConfirm)

  return (
    <ul
      className={cn(
        'text-muted-foreground border-border/60 bg-muted/40 space-y-1.5 rounded-lg border px-3 py-2.5 text-xs leading-relaxed',
        className
      )}
      aria-live="polite"
    >
      <li className="flex items-start gap-2">
        {lengthOk ? (
          <Check
            className="mt-0.5 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-500"
            aria-hidden
          />
        ) : (
          <Circle className="mt-0.5 size-3.5 shrink-0 opacity-40" aria-hidden />
        )}
        <span className={cn(lengthOk && 'text-foreground font-medium')}>
          At least {AUTH_MIN_PASSWORD_LENGTH} characters
        </span>
      </li>
      {showMatchRow ? (
        <li className="flex items-start gap-2">
          {matchOk ? (
            <Check
              className="mt-0.5 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-500"
              aria-hidden
            />
          ) : (
            <Circle className="mt-0.5 size-3.5 shrink-0 opacity-40" aria-hidden />
          )}
          <span className={cn(matchOk && 'text-foreground font-medium')}>Passwords match</span>
        </li>
      ) : null}
    </ul>
  )
}
