'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { safeReturnPath } from '@/lib/auth-redirect'
import { createClient } from '@/lib/supabase/client'

type LoginFormProps = {
  redirectTo?: string | null
}

export function LoginForm({ redirectTo }: LoginFormProps) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const supabase = createClient()
    const { error: signError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (signError) {
      setError(signError.message)
      return
    }
    router.refresh()
    router.push(safeReturnPath(redirectTo))
  }

  return (
    <form onSubmit={onSubmit} className="gap-block flex flex-col">
      <div className="space-y-inset">
        <Label htmlFor="login-email">Email</Label>
        <Input
          id="login-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="space-y-inset">
        <Label htmlFor="login-password">Password</Label>
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" variant="cta" disabled={loading}>
        {loading ? 'Signing in…' : 'Log in'}
      </Button>
      <p className="text-muted-foreground text-center text-sm">
        First user setting up the org?{' '}
        <Link
          href="/auth/sign-up"
          className="text-primary font-medium underline-offset-4 hover:underline"
        >
          Create the admin account
        </Link>
      </p>
    </form>
  )
}
