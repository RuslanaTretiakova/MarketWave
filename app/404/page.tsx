import type { Metadata } from 'next'

import { NotFoundView } from '@/components/layout/not-found-view'

export const metadata: Metadata = {
  title: 'Page not found',
}

/** Explicit URL for middleware fallbacks when env/session is unavailable. */
export default function NotFoundPage() {
  return <NotFoundView />
}
