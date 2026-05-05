'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Supabase sometimes redirects recovery/invite links to the project's Site URL root with
 * session tokens in the hash (implicit flow). Our session exchange only runs on `/auth/callback`,
 * so bounce there with the same search + hash via full navigation (App Router won't run callback
 * from `history.replaceState` alone).
 */
export function AuthSessionHashHandler() {
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const hash = window.location.hash
    if (!hash.startsWith('#') || hash.length < 8) return

    const params = new URLSearchParams(hash.slice(1))
    const access = params.get('access_token')
    const refresh = params.get('refresh_token')
    if (!access || !refresh) return

    if (pathname === '/auth/callback' || pathname.startsWith('/auth/callback/')) {
      return
    }

    const search = window.location.search
    const target = `/auth/callback${search}${hash}`
    window.location.replace(target)
  }, [pathname])

  return null
}
