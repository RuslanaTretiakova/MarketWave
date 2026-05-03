import Link from 'next/link'

import { AuthFormCard, AuthFormFooterLink } from '@/components/auth'
import { ForgotPasswordForm } from '@/components/forgot-password-form'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const metadata = {
  title: 'Reset password',
}

export default function ForgotPasswordPage() {
  return (
    <div className="gap-layout mx-auto flex w-full max-w-md flex-col">
      <AuthFormCard
        title="Reset password"
        description="We'll email you a secure link to set a new password."
        footer={<AuthFormFooterLink href="/auth/login">Back to sign in</AuthFormFooterLink>}
      >
        <ForgotPasswordForm />
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
