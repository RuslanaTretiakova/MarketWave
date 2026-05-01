import Link from 'next/link'

import { Logo } from '@/components/layout/logo'
import { SITE_NAME } from '@/lib/brand'
import { cn } from '@/lib/utils'

type SiteBrandLinkProps = {
  href?: string
  className?: string
  /** Wordmark only (no icon tile). */
  hideLogo?: boolean
  /** Applied to the [`Logo`] root (e.g. sidebar token overrides). */
  logoClassName?: string
}

/** Home link with full logo or text-only wordmark. */
export function SiteBrandLink({
  href = '/',
  className,
  hideLogo = false,
  logoClassName,
}: SiteBrandLinkProps) {
  return (
    <Link
      href={href}
      className={cn('inline-flex items-center transition-opacity hover:opacity-90', className)}
    >
      {hideLogo ? (
        <span className="text-foreground text-lg leading-none font-semibold tracking-tight">
          {SITE_NAME}
        </span>
      ) : (
        <Logo className={logoClassName} />
      )}
    </Link>
  )
}
