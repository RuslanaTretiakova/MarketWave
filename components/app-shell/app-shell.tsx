'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'

import { AppHeader } from '@/components/app-shell/app-header'
import type { AppShellUser } from '@/components/app-shell/app-shell-user'
import { AppSidebar } from '@/components/app-shell/app-sidebar'

const SIDEBAR_COLLAPSED_KEY = 'mw-app-sidebar-collapsed'

export function AppShell({ user, children }: { user: AppShellUser; children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(() => {
      if (cancelled) return
      try {
        if (window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1') {
          setSidebarCollapsed(true)
        }
      } catch {
        /* ignore */
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  function toggleSidebarCollapsed() {
    setSidebarCollapsed((prev) => {
      const next = !prev
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }

  return (
    <div className="bg-app-shell-canvas flex min-h-screen">
      <AppSidebar
        className="hidden md:flex"
        collapsed={sidebarCollapsed}
        onToggleCollapsed={toggleSidebarCollapsed}
      />
      <div className="bg-app-shell-canvas flex min-w-0 flex-1 flex-col">
        <AppHeader user={user} />
        <main className="text-foreground px-block py-layout md:px-layout flex-1">{children}</main>
      </div>
    </div>
  )
}
