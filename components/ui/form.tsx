import * as React from 'react'

import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

function Form({ className, ...props }: React.ComponentProps<'form'>) {
  return <form className={cn('space-y-block', className)} {...props} />
}

function FormItem({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('gap-inset flex flex-col', className)} {...props} />
}

function FormLabel({ className, ...props }: React.ComponentProps<typeof Label>) {
  return <Label className={cn(className)} {...props} />
}

function FormControl({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('w-full', className)} {...props} />
}

function FormDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return <p className={cn('text-muted-foreground text-xs leading-relaxed', className)} {...props} />
}

function FormMessage({ className, ...props }: React.ComponentProps<'p'>) {
  return <p className={cn('text-destructive text-xs leading-relaxed', className)} {...props} />
}

export { Form, FormControl, FormDescription, FormItem, FormLabel, FormMessage }
