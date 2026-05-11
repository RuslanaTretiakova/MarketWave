import * as React from 'react'

import { FormControlInput, formControlInputClassName } from '@/components/ui/form-control'
import { cn } from '@/lib/utils'

export { FormControlInput as FilterInput }

export function FilterSelect({ className, ...props }: React.ComponentProps<'select'>) {
  return (
    <select className={cn(formControlInputClassName, 'cursor-pointer', className)} {...props} />
  )
}
