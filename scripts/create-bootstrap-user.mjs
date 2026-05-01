/**
 * One-off / CLI: create Auth user + profile via handle_new_user (bootstrap metadata).
 * Usage: node scripts/create-bootstrap-user.mjs "Full Name" email@example.com
 */
import { readFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

function loadDotEnv() {
  try {
    const raw = readFileSync(new URL('../.env', import.meta.url), 'utf8')
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const k = trimmed.slice(0, eq).trim()
      let v = trimmed.slice(eq + 1).trim()
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1)
      }
      if (!process.env[k]) process.env[k] = v
    }
  } catch {
    /* use existing env */
  }
}

loadDotEnv()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (.env).')
  process.exit(1)
}

const fullName = process.argv[2] ?? 'Ruslana Tretiakova'
const email = (process.argv[3] ?? 'ruslana.tretiakova@archysoft.com').toLowerCase().trim()

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { data: listData, error: listErr } = await supabase.auth.admin.listUsers({
  page: 1,
  perPage: 1000,
})
if (listErr) {
  console.error(listErr.message)
  process.exit(1)
}

const existing = listData?.users?.find((u) => u.email?.toLowerCase() === email)
if (existing) {
  console.error(`User already exists (id ${existing.id}). Use Dashboard to edit metadata or delete first.`)
  process.exit(1)
}

const tempPassword = randomBytes(24).toString('base64url').slice(0, 32)

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password: tempPassword,
  email_confirm: true,
  user_metadata: {
    full_name: fullName,
    is_bootstrap_admin: true,
    role: 'admin',
  },
})

if (error) {
  console.error(error.message)
  process.exit(1)
}

console.log('Created:', data.user?.id, email)
console.log('')
console.log('Temporary password (share securely; rotate after first login):')
console.log(tempPassword)
console.log('')
console.log(
  'If an admin profile already existed, DB trigger may have assigned role client — check Table Editor → profiles.'
)
