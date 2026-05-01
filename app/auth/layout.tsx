import type { ReactNode } from 'react'

import { AuthSplitLayout } from '@/components/layout/auth-split-layout'

export const dynamic = 'force-dynamic'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <AuthSplitLayout>{children}</AuthSplitLayout>
}
