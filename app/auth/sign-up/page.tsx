import Link from 'next/link'

import { SignUpForm } from '@/components/sign-up-form'
import { buttonVariants } from '@/components/ui/button'
import { createClientOrNull } from '@/lib/supabase/server'
import { SITE_NAME } from '@/lib/brand'
import { cn } from '@/lib/utils'

export const metadata = {
  title: 'Sign up',
}

export default async function SignUpPage() {
  const supabase = await createClientOrNull()
  if (!supabase) {
    return (
      <div className="mx-auto w-full max-w-md">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          Sign up unavailable
        </h1>
        <p className="text-muted-foreground mt-inset text-sm leading-relaxed">
          This deployment is missing{' '}
          <code className="bg-muted rounded px-1 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_URL</code> or{' '}
          <code className="bg-muted rounded px-1 py-0.5 text-xs">
            NEXT_PUBLIC_SUPABASE_ANON_KEY
          </code>
          . Add both in your host&apos;s environment (for example Vercel → Settings → Environment
          Variables), then redeploy.
        </p>
        <Link
          href="/auth/login"
          className={cn(
            buttonVariants({ variant: 'cta', size: 'default' }),
            'mt-layout inline-flex'
          )}
        >
          Back to log in
        </Link>
      </div>
    )
  }

  const { data, error } = await supabase.rpc('bootstrap_signup_allowed')
  const allowed = !error && data === true

  return (
    <div className="mx-auto w-full max-w-md">
      <h1 className="text-foreground text-2xl font-semibold tracking-tight">Sign up</h1>
      <p className="text-muted-foreground mt-inset text-sm leading-relaxed">
        {allowed
          ? `Create the first ${SITE_NAME} admin for your organization.`
          : 'Self-service sign-up is closed for this organization.'}
      </p>
      <div className="border-border bg-card ring-foreground/10 mt-layout p-section rounded-xl border shadow-sm ring-1">
        {allowed ? (
          <SignUpForm />
        ) : (
          <div className="gap-block flex flex-col text-sm">
            <p className="text-muted-foreground leading-relaxed">
              Access is by invitation. If you already have an account, use Log in. Your admin can
              invite you by email.
            </p>
            <Link
              href="/auth/login"
              className={cn(buttonVariants({ variant: 'cta', size: 'default' }))}
            >
              Log in
            </Link>
          </div>
        )}
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
