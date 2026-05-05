import Link from 'next/link'

import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Centered marketing-style 404 (used by `app/not-found.tsx`, `/404`, and `notFound()` flows). */
export function NotFoundView() {
  return (
    <main className="bg-background text-foreground px-block py-hero flex min-h-full flex-1 flex-col items-center justify-center">
      <div className="max-w-md text-center">
        <p className="font-display text-5xl font-bold tracking-tight sm:text-6xl">404</p>
        <h1 className="mt-layout font-sans text-xl font-semibold tracking-tight sm:text-2xl">
          Page not found
        </h1>
        <p className="text-muted-foreground mt-block text-sm leading-relaxed sm:text-base">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className={cn(
            buttonVariants({ variant: 'default', size: 'lg' }),
            'marketing-lift-hover mt-layout inline-flex rounded-xl px-8 font-sans font-semibold'
          )}
        >
          Go home
        </Link>
      </div>
    </main>
  )
}
