import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import type { ReactNode } from 'react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function SideListCard({
  title,
  description,
  link,
  badge,
  children,
  contentClassName,
  className,
}: {
  title: string
  description?: string
  link?: { href: string; label?: string }
  /** Optional right-side badge (e.g. count chip). Replaces `link` if both supplied. */
  badge?: ReactNode
  children: ReactNode
  contentClassName?: string
  className?: string
}) {
  return (
    <Card className={cn('border-border rounded-2xl shadow-none', className)}>
      <CardHeader className="gap-inset border-border [.border-b]:pb-section border-b">
        <div className="gap-inset flex flex-wrap items-start justify-between">
          <div>
            <CardTitle className="font-heading text-xl tracking-tight">{title}</CardTitle>
            {description ? (
              <CardDescription className="font-sans text-sm">{description}</CardDescription>
            ) : null}
          </div>
          {badge ? (
            badge
          ) : link ? (
            <Link
              href={link.href}
              className="text-primary inline-flex items-center gap-1 font-sans text-sm font-medium hover:underline"
            >
              {link.label ?? 'All'}
              <ArrowUpRight className="size-4" aria-hidden />
            </Link>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className={cn('pt-section pb-section', contentClassName)}>
        {children}
      </CardContent>
    </Card>
  )
}
