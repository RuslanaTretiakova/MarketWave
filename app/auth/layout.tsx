import type { ReactNode } from 'react'

import { AuthSplitLayout } from '@/components/auth'

export const dynamic = 'force-dynamic'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <AuthSplitLayout>{children}</AuthSplitLayout>
}
