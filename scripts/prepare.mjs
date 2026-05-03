#!/usr/bin/env node
/**
 * Run husky after install when developing locally; skip in CI and when `.git` is missing
 * (avoids failed deploys on platforms that clone shallowly or omit git metadata).
 */
import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'

const ci = process.env.CI === 'true' || process.env.CI === '1'
if (ci || !existsSync('.git')) {
  process.exit(0)
}

try {
  execSync('husky', { stdio: 'inherit' })
} catch {
  process.exit(1)
}
