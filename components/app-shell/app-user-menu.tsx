'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Settings } from 'lucide-react'

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
import { buttonVariants } from '@/components/ui/button'
import { signOutAndRedirectToLogin } from '@/lib/auth/client-sign-out'
import type { Database } from '@/lib/supabase/types'
import { avatarInitialsFromProfile, splitDisplayName } from '@/lib/user-display-name'
import { cn } from '@/lib/utils'

const ROLE_LABEL: Record<Database['public']['Enums']['user_role'], string> = {
  admin: 'Admin',
  client: 'Client',
  manager: 'Manager',
  sourcer: 'Sourcer',
  copywriter: 'Copywriter',
}

function UserMenuAvatar({
  avatarUrl,
  initials,
  nameForAlt,
}: {
  avatarUrl: string | null
  initials: string
  nameForAlt: string
}) {
  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={`${nameForAlt} — profile photo`}
        width={32}
        height={32}
        unoptimized
        className="size-8 shrink-0 rounded-full object-cover"
      />
    )
  }
  return (
    <span
      aria-hidden
      className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
    >
      {initials || '?'}
    </span>
  )
}

export function AppUserMenu({ user }: { user: AppShellUser }) {
  const router = useRouter()
  const { first, last } = splitDisplayName(user.fullName, user.email)
  const lineName = [first, last].filter(Boolean).join(' ') || user.email
  const initials = avatarInitialsFromProfile(user.fullName, user.email)
  const roleLabel = ROLE_LABEL[user.role]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        type="button"
        className={cn(
          buttonVariants({ variant: 'outline', size: 'sm' }),
          'pr-block h-auto min-h-8 max-w-[min(100%,14rem)] shrink gap-2 py-1.5 pl-1.5 [&>span]:min-w-0'
        )}
        aria-label={`Account menu for ${lineName}`}
      >
        <UserMenuAvatar avatarUrl={user.avatarUrl} initials={initials} nameForAlt={lineName} />
        <span className="flex min-w-0 flex-col items-start text-left leading-tight">
          <span className="text-foreground w-full truncate font-medium">{lineName}</span>
          <span className="text-muted-foreground w-full truncate text-xs font-normal">
            {roleLabel}
          </span>
        </span>
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
