import Link from 'next/link'

import { SetPasswordForm } from '@/components/set-password-form'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const metadata = {
  title: 'Set password',
}

export default function FirstLoginPasswordPage() {
  return (
    <div className="mx-auto w-full max-w-md">
      <h1 className="marketing-heading text-foreground text-2xl font-semibold tracking-tight">
        Set your password
      </h1>
      <p className="text-muted-foreground mt-inset text-sm leading-relaxed">
        Choose a password before continuing to the dashboard.
      </p>
      <div className="border-border bg-card ring-foreground/10 mt-layout p-section rounded-xl border shadow-sm ring-1">
        <SetPasswordForm mode="first-login" />
      </div>
      <Link
        href="/"
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'default' }),
          'mt-layout inline-flex'
        )}
      >
        ← Back to home
      </Link>
    </div>
  )
}
