'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { LayoutDashboard, LogOut, User } from 'lucide-react'

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

type MarketingUserMenuProps = {
  email: string
  fullName: string | null
  avatarUrl: string | null
}

export function MarketingUserMenu({
  email,
  fullName,
  avatarUrl: initialAvatarUrl,
}: MarketingUserMenuProps) {
  const router = useRouter()
  const pathname = usePathname()
  const onDashboard = pathname === '/dashboard'
  const [avatarUrl, setAvatarUrl] = useState<string | null>(() =>
    normalizeAccountAvatarUrl(initialAvatarUrl)
  )

  const { first, last } = splitDisplayName(fullName, email)
  const lineName = [first, last].filter(Boolean).join(' ') || email
  const initials = avatarInitialsFromProfile(fullName, email)

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
        aria-label={`Account menu for ${lineName}`}
        className={cn(
          'inline-flex size-10 shrink-0 items-center justify-center rounded-full border-0 bg-transparent p-0',
          'cursor-pointer transition-opacity outline-none hover:opacity-90',
          'focus-visible:ring-ring focus-visible:ring-offset-background ring-offset-background focus-visible:ring-3 focus-visible:ring-offset-2'
        )}
      >
        <AccountMenuAvatar
          key={avatarUrl ?? '__none__'}
          avatarUrl={avatarUrl}
          initials={initials}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <span className="text-muted-foreground block text-xs">Signed in</span>
            <span className="max-w-56 truncate">{email}</span>
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
