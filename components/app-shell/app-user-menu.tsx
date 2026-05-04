'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Settings, User } from 'lucide-react'

import type { AppShellUser } from '@/components/app-shell/app-shell-user'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { signOutAndRedirectToLogin } from '@/lib/auth/client-sign-out'
import {
  MW_PROFILE_AVATAR_UPDATED_EVENT,
  type MwProfileAvatarUpdatedDetail,
} from '@/lib/profile/profile-avatar-sync'
import { createClient } from '@/lib/supabase/client'
import { avatarInitialsFromProfile, splitDisplayName } from '@/lib/user-display-name'
import { cn } from '@/lib/utils'

function normalizeAvatarUrl(url: string | null | undefined): string | null {
  const t = url?.trim()
  return t ? t : null
}

function UserMenuAvatar({ avatarUrl, initials }: { avatarUrl: string | null; initials: string }) {
  const [imgBroken, setImgBroken] = useState(false)

  const resolved = normalizeAvatarUrl(avatarUrl)
  if (resolved && !imgBroken) {
    return (
      <img
        src={resolved}
        alt=""
        width={40}
        height={40}
        decoding="async"
        className="pointer-events-none size-10 shrink-0 rounded-full object-cover"
        onError={() => setImgBroken(true)}
      />
    )
  }
  return (
    <span
      aria-hidden
      className={cn(
        'pointer-events-none flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white',
        'bg-(--accent-teal-strong)'
      )}
    >
      {initials || '?'}
    </span>
  )
}

export function AppUserMenu({ user }: { user: AppShellUser }) {
  const router = useRouter()
  const pathname = usePathname()
  const [avatarUrl, setAvatarUrl] = useState<string | null>(() =>
    normalizeAvatarUrl(user.avatarUrl)
  )

  const { first, last } = splitDisplayName(user.fullName, user.email)
  const lineName = [first, last].filter(Boolean).join(' ') || user.email
  const initials = avatarInitialsFromProfile(user.fullName, user.email)

  useEffect(() => {
    const next = normalizeAvatarUrl(user.avatarUrl)
    queueMicrotask(() => {
      setAvatarUrl(next)
    })
  }, [user.avatarUrl])

  useEffect(() => {
    function onAvatarUpdated(e: Event) {
      const ce = e as CustomEvent<MwProfileAvatarUpdatedDetail>
      if (ce.detail && 'avatarUrl' in ce.detail) {
        setAvatarUrl(normalizeAvatarUrl(ce.detail.avatarUrl))
      }
    }
    window.addEventListener(MW_PROFILE_AVATAR_UPDATED_EVENT, onAvatarUpdated)
    return () => window.removeEventListener(MW_PROFILE_AVATAR_UPDATED_EVENT, onAvatarUpdated)
  }, [])

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    async function syncAvatarFromProfile() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()
      if (!authUser || cancelled) return
      const { data: row } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', authUser.id)
        .maybeSingle()
      if (cancelled) return
      setAvatarUrl(normalizeAvatarUrl(row?.avatar_url ?? null))
    }

    void syncAvatarFromProfile()

    function onVisible() {
      if (document.visibilityState === 'visible') void syncAvatarFromProfile()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [pathname, user.avatarUrl])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        type="button"
        className={cn(
          'inline-flex size-10 shrink-0 items-center justify-center rounded-full border-0 bg-transparent p-0',
          'cursor-pointer transition-opacity outline-none hover:opacity-90',
          'focus-visible:ring-ring focus-visible:ring-offset-background ring-offset-background focus-visible:ring-3 focus-visible:ring-offset-2'
        )}
        aria-label={`Account menu for ${lineName}`}
      >
        <UserMenuAvatar key={avatarUrl ?? '__none__'} avatarUrl={avatarUrl} initials={initials} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <span className="text-muted-foreground block text-xs">Signed in</span>
            <span className="truncate">{user.email}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => router.push('/settings/profile')}>
            <User aria-hidden />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/settings')}>
            <Settings aria-hidden />
            Settings
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem variant="destructive" onClick={() => void signOutAndRedirectToLogin()}>
            Log out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
