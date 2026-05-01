import Link from 'next/link'

import { ForgotPasswordForm } from '@/components/forgot-password-form'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const metadata = {
  title: 'Reset password',
}

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto w-full max-w-md">
      <h1 className="marketing-heading text-foreground text-2xl font-semibold tracking-tight">
        Reset password
      </h1>
      <p className="text-muted-foreground mt-inset text-sm leading-relaxed">
        We&apos;ll email you a secure link to set a new password.
      </p>
      <div className="border-border bg-card ring-foreground/10 mt-layout p-section rounded-xl border shadow-sm ring-1">
        <ForgotPasswordForm />
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
