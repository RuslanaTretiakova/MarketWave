import * as React from 'react'

import { FormControlInput, formControlInputClassName } from '@/components/ui/form-control'
import { cn } from '@/lib/utils'

export function FilterInput({
  className,
  ...props
}: React.ComponentProps<typeof FormControlInput>) {
  return <FormControlInput className={cn('bg-background', className)} {...props} />
}

export function FilterSelect({ className, ...props }: React.ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        formControlInputClassName,
        'bg-background w-full cursor-pointer sm:w-auto',
        className
      )}
      {...props}
    />
  )
}

export function FilterBar({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('gap-inset flex flex-col sm:flex-row sm:flex-wrap sm:items-center', className)}
      {...props}
    />
  )
}
