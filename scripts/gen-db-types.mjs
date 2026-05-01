/**
 * Writes UTF-8 types (PowerShell `>` redirects as UTF-16 and breaks `tsc`).
 */
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outPath = join(root, 'lib/supabase/types/database.types.new.ts')

const args = ['supabase', 'gen', 'types', 'typescript', '--linked']
const opts = { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 }

const stdout =
  process.platform === 'win32'
    ? execFileSync('cmd.exe', ['/c', 'npx', ...args], opts)
    : execFileSync('npx', args, opts)

writeFileSync(outPath, stdout, 'utf8')
