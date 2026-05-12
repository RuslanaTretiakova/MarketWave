import type { Metadata } from 'next'

import { NotFoundView } from '@/components/system/not-found-view'

export const metadata: Metadata = {
  title: 'Page not found',
}

export default function NotFoundPage() {
  return <NotFoundView />
}
