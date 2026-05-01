/**
 * Set a user's password via Auth Admin API (service role).
 * Usage: node scripts/set-user-password.mjs email@example.com "new-password"
 */
import { readFileSync } from 'node:fs'
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
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
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

const email = process.argv[2]?.toLowerCase().trim()
const password = process.argv[3]

if (!email || !email.includes('@') || !password) {
  console.error('Usage: node scripts/set-user-password.mjs email@example.com <password>')
  process.exit(1)
}

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

const user = listData?.users?.find((u) => u.email?.toLowerCase() === email)
if (!user) {
  console.error(`No Auth user found for ${email}`)
  process.exit(1)
}

const { error } = await supabase.auth.admin.updateUserById(user.id, { password })

if (error) {
  console.error(error.message)
  process.exit(1)
}

console.log(`Password updated for ${email} (user id ${user.id}).`)
