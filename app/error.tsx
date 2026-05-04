'use client'

import { useEffect } from 'react'
import Link from 'next/link'

import { Button, buttonVariants } from '@/components/ui/button'
import { SITE_NAME } from '@/lib/brand'
import { cn } from '@/lib/utils'

/** Next.js catches errors beneath the root layout. Reports once per instance (fire-and-forget). */
export default function RouteErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    void fetch('/api/client-error', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        context: 'app/error.tsx',
        message: error.message || 'Unhandled client render error',
        level: 'error',
        payload: {
          digest: error.digest ?? null,
          stack: typeof error.stack === 'string' ? error.stack.slice(0, 8000) : null,
          name: error.name,
        },
      }),
    }).catch(() => {})
  }, [error])

  return (
    <main className="p-inset text-foreground gap-layout flex min-h-[50vh] flex-col items-center justify-center">
      <div className="border-border gap-block px-section py-layout max-w-md rounded-xl border text-center shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">Something went wrong</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {SITE_NAME} hit an unexpected error. You can retry or return home. If this keeps
          happening, contact support.
        </p>
        <div className="gap-inset pt-inset flex flex-wrap items-center justify-center">
          <Button type="button" onClick={() => reset()}>
            Try again
          </Button>
          <Link href="/" className={cn(buttonVariants({ variant: 'outline', size: 'default' }))}>
            Back to home
          </Link>
        </div>
      </div>
    </main>
  )
}
