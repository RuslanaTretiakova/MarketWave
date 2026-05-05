import Link from 'next/link'

import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const metadata = {
  title: 'Configuration',
}

export default function MaintenancePage() {
  return (
    <div className="bg-background text-foreground gap-layout px-block py-hero flex min-h-full flex-col items-center justify-center">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Configuration required</h1>
        <p className="text-muted-foreground mt-inset text-sm leading-relaxed">
          The dashboard needs Supabase environment variables. Set{' '}
          <code className="bg-muted rounded px-1 py-0.5 text-xs">SUPABASE_URL</code> and{' '}
          <code className="bg-muted rounded px-1 py-0.5 text-xs">SUPABASE_KEY</code> (anon), or{' '}
          <code className="bg-muted rounded px-1 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
          <code className="bg-muted rounded px-1 py-0.5 text-xs">
            NEXT_PUBLIC_SUPABASE_ANON_KEY
          </code>
          , for this environment (for example in Vercel → Project → Settings → Environment
          Variables), then redeploy.
        </p>
        <div className="mt-layout gap-inset flex flex-wrap items-center justify-center">
          <Link href="/" className={cn(buttonVariants({ variant: 'cta' }))}>
            Home
          </Link>
          <Link href="/auth/login" className={cn(buttonVariants({ variant: 'outline' }))}>
            Log in
          </Link>
        </div>
      </div>
    </div>
  )
}
