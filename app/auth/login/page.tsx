import Link from 'next/link'

import { LoginForm } from '@/components/login-form'
import { buttonVariants } from '@/components/ui/button'
import { SITE_NAME } from '@/lib/brand'
import { cn } from '@/lib/utils'

export const metadata = {
  title: 'Log in',
}

type LoginPageProps = {
  searchParams: Promise<{ next?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next } = await searchParams

  return (
    <div className="mx-auto w-full max-w-md">
      <h1 className="text-foreground text-2xl font-semibold tracking-tight">Log in</h1>
      <p className="text-muted-foreground mt-inset text-sm leading-relaxed">
        {SITE_NAME} — sign in with your work email to open the ops dashboard.
      </p>
      <div className="border-border bg-card ring-foreground/10 mt-layout p-section rounded-xl border shadow-sm ring-1">
        <LoginForm redirectTo={next} />
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
