import type { ComponentProps } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type AuthPrimaryButtonProps = ComponentProps<typeof Button>

export function AuthPrimaryButton({
  className,
  variant = 'cta',
  size = 'lg',
  ...props
}: AuthPrimaryButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      className={cn(
        'min-h-10 w-full rounded-full text-base font-semibold shadow-(--shadow-accent)',
        className
      )}
      {...props}
    />
  )
}
