import Link from 'next/link'

import { cn } from '@/lib/utils'

type AuthFormFooterLinkProps = {
  href: string
  children: React.ReactNode
  className?: string
}

export function AuthFormFooterLink({ href, children, className }: AuthFormFooterLinkProps) {
  return (
    <div className={cn('text-center', className)}>
      <Link href={href} className="text-muted-foreground text-sm font-medium hover:underline">
        {children}
      </Link>
    </div>
  )
}
