'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { LayoutDashboard, LogOut, User } from 'lucide-react'

import type { AppShellUser } from '@/components/app-shell/app-shell-user'
import {
  AccountMenuAvatar,
  normalizeAccountAvatarUrl,
} from '@/components/user-menu/account-menu-avatar'
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
import { avatarInitialsFromProfile, splitDisplayName } from '@/lib/user-display-name'
import { cn } from '@/lib/utils'

export function AppUserMenu({ user }: { user: AppShellUser }) {
  const router = useRouter()
  const pathname = usePathname()
  const onDashboard = pathname === '/dashboard'
  const [avatarUrl, setAvatarUrl] = useState<string | null>(() =>
    normalizeAccountAvatarUrl(user.avatarUrl)
  )

  const { first, last } = splitDisplayName(user.fullName, user.email)
  const lineName = [first, last].filter(Boolean).join(' ') || user.email
  const initials = avatarInitialsFromProfile(user.fullName, user.email)

  useEffect(() => {
    function onAvatarUpdated(e: Event) {
      const ce = e as CustomEvent<MwProfileAvatarUpdatedDetail>
      if (ce.detail && 'avatarUrl' in ce.detail) {
        setAvatarUrl(normalizeAccountAvatarUrl(ce.detail.avatarUrl))
      }
    }
    window.addEventListener(MW_PROFILE_AVATAR_UPDATED_EVENT, onAvatarUpdated)
    return () => window.removeEventListener(MW_PROFILE_AVATAR_UPDATED_EVENT, onAvatarUpdated)
  }, [])

  function handleNavigateProfile() {
    router.push('/settings/profile')
  }

  function handleNavigateDashboard() {
    router.push('/dashboard')
  }

  function handleSignOut() {
    void signOutAndRedirectToLogin()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        type="button"
        className={cn(
          'relative inline-flex size-10 min-h-10 min-w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-0 bg-transparent p-0',
          'hover:bg-muted/80 cursor-pointer transition-colors outline-none',
          'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2'
        )}
        aria-label={`Account menu for ${lineName}`}
      >
        <AccountMenuAvatar
          key={avatarUrl ?? '__none__'}
          avatarUrl={avatarUrl}
          initials={initials}
          sizeClass="size-full min-h-0 min-w-0"
        />
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
          <DropdownMenuItem onClick={handleNavigateProfile}>
            <User aria-hidden />
            Profile
          </DropdownMenuItem>
          {!onDashboard && (
            <DropdownMenuItem onClick={handleNavigateDashboard}>
              <LayoutDashboard aria-hidden />
              Dashboard
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
            <LogOut aria-hidden />
            Log out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
