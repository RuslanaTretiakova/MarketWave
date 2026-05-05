import Link from 'next/link'

import { AuthFormCard, AuthFormFooterLink, SetPasswordForm } from '@/components/auth'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const metadata = {
  title: 'Update password',
}

export default function UpdatePasswordPage() {
  return (
    <div className="gap-layout mx-auto flex w-full max-w-md flex-col">
      <AuthFormCard
        title="Set new password"
        description="Choose a new password for your account."
        extraDescription="Open this page from the password reset link in your email to continue."
        footer={<AuthFormFooterLink href="/auth/login">Back to sign in</AuthFormFooterLink>}
      >
        <SetPasswordForm mode="recovery" />
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
