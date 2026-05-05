import Link from 'next/link'

import { AuthFormCard, SetPasswordForm } from '@/components/auth'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const metadata = {
  title: 'Set password',
}

export default function FirstLoginPasswordPage() {
  return (
    <div className="gap-layout mx-auto flex w-full max-w-md flex-col">
      <AuthFormCard
        title="Set your password"
        description="Choose a password before continuing to the dashboard."
      >
        <SetPasswordForm mode="first-login" />
      </AuthFormCard>
      <Link
        href="/"
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'default' }),
          'inline-flex self-start'
        )}
      >
        ← Back to home
      </Link>
    </div>
  )
}
