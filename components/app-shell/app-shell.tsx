'use client'

import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'

import { AppBreadcrumbs } from '@/components/app-shell/app-breadcrumbs'
import { AppHeader } from '@/components/app-shell/app-header'
import type { AppShellUser } from '@/components/app-shell/app-shell-user'
import { AppSidebar } from '@/components/app-shell/app-sidebar'
import { getAppNavItems } from '@/lib/app-nav'

const SIDEBAR_COLLAPSED_KEY = 'mw-app-sidebar-collapsed'

export function AppShell({
  user,
  chatUnreadCount = 0,
  notificationsUnreadCount = 0,
  cartItemCount = 0,
  children,
}: {
  user: AppShellUser
  chatUnreadCount?: number
  notificationsUnreadCount?: number
  cartItemCount?: number
  children: ReactNode
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const navItems = useMemo(() => getAppNavItems(user.role), [user.role])
  const navBadges = useMemo<Record<string, number>>(() => {
    const map: Record<string, number> = {}
    if (chatUnreadCount > 0) map['/chats'] = chatUnreadCount
    if (cartItemCount > 0) map['/cart'] = cartItemCount
    return map
  }, [chatUnreadCount, cartItemCount])

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
        navItems={navItems}
        navBadges={navBadges}
      />
      <div className="bg-app-shell-canvas flex min-w-0 flex-1 flex-col">
        <AppHeader
          user={user}
          navItems={navItems}
          navBadges={navBadges}
          notificationsUnreadCount={notificationsUnreadCount}
          cartItemCount={cartItemCount}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebarCollapsed={toggleSidebarCollapsed}
        />
        <main className="text-foreground px-block py-layout md:px-layout flex-1">
          <AppBreadcrumbs navItems={navItems} />
          {children}
        </main>
      </div>
    </div>
  )
}
