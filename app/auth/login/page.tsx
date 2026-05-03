import Link from 'next/link'
import { Suspense } from 'react'

import { AuthFormCard } from '@/components/auth'
import { LoginForm } from '@/components/login-form'
import { buttonVariants } from '@/components/ui/button'
import { SITE_NAME } from '@/lib/brand'
import { cn } from '@/lib/utils'

export const metadata = {
  title: 'Sign in',
}

type LoginPageProps = {
  searchParams: Promise<{ next?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next } = await searchParams

  return (
    <div className="gap-layout mx-auto flex w-full max-w-md flex-col">
      <AuthFormCard title="Sign in" description={`Welcome back to ${SITE_NAME}`}>
        <Suspense
          fallback={
            <p className="text-muted-foreground text-center text-sm leading-relaxed">Loading…</p>
          }
        >
          <LoginForm redirectTo={next} />
        </Suspense>
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
