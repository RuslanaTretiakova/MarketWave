'use client'

import { LayoutDashboard, LogOut } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { signOutAndRedirect } from '@/lib/auth/client-sign-out'
import { avatarInitialsFromProfile } from '@/lib/user-display-name'
import { cn } from '@/lib/utils'

type MarketingUserMenuProps = {
  email: string
  fullName: string | null
}

export function MarketingUserMenu({ email, fullName }: MarketingUserMenuProps) {
  const initials = avatarInitialsFromProfile(fullName, email)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        type="button"
        aria-label="Account menu"
        className={cn(
          'bg-primary-soft text-foreground focus-visible:ring-ring inline-flex size-9 shrink-0 items-center justify-center rounded-full font-sans text-sm font-semibold tracking-tight',
          'outline-none focus-visible:ring-3'
        )}
      >
        {initials}
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
          <DropdownMenuItem
            onClick={() => {
              window.location.assign('/dashboard')
            }}
          >
            <LayoutDashboard aria-hidden />
            Go to dashboard
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem variant="destructive" onClick={() => void signOutAndRedirect('/')}>
            <LogOut aria-hidden />
            Log out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
