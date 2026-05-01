import type { ReactNode } from 'react'

import { AppHeader } from '@/components/app-shell/app-header'
import { AppSidebar } from '@/components/app-shell/app-sidebar'

export function AppShell({ userEmail, children }: { userEmail: string; children: ReactNode }) {
  return (
    <div className="bg-background flex min-h-screen">
      <AppSidebar className="hidden md:flex" />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader userEmail={userEmail} />
        <main className="px-block py-layout md:px-layout flex-1">{children}</main>
      </div>
    </div>
  )
}
