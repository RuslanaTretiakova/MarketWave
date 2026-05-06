'use client'

import { useEffect } from 'react'

import { Button } from '@/components/ui/button'
import '@/app/globals.css'

/** Renders outside the root layout when the root layout itself fails — keep HTML self-contained. */
export default function GlobalErrorBoundary({
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
        context: 'app/global-error.tsx',
        message: error.message || 'Unhandled global error',
        level: 'critical',
        payload: {
          digest: error.digest ?? null,
          stack: typeof error.stack === 'string' ? error.stack.slice(0, 8000) : null,
          name: error.name,
        },
      }),
    }).catch(() => {})
  }, [error])

  function handleReset() {
    reset()
  }

  return (
    <html lang="en">
      <body className="text-foreground flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-8 text-center dark:bg-zinc-950">
        <div className="border-border rounded-xl border bg-white px-8 py-10 shadow-sm dark:bg-zinc-900">
          <h1 className="text-xl font-semibold tracking-tight">Application error</h1>
          <p className="text-muted-foreground mt-4 max-w-sm text-sm leading-relaxed dark:text-zinc-400">
            The app failed to render. Reload the page or try again in a moment.
          </p>
          <Button type="button" className="mt-8" onClick={handleReset}>
            Try again
          </Button>
        </div>
      </body>
    </html>
  )
}
