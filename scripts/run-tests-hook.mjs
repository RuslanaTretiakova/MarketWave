#!/usr/bin/env node
/**
 * PostToolUse hook — runs `npm test` after Write/Edit on .ts/.tsx files.
 * Outputs JSON so Claude Code injects pass/fail context into the conversation.
 */
import { execSync } from 'child_process'

const projectRoot = new URL('../', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')

async function readStdin() {
  const chunks = []
  for await (const chunk of process.stdin) chunks.push(chunk)
  return Buffer.concat(chunks).toString('utf8')
}

const raw = await readStdin()

let toolInput = {}
try {
  toolInput = JSON.parse(raw).tool_input ?? {}
} catch {
  process.exit(0)
}

const filePath = toolInput.file_path ?? ''

// Only run on TypeScript source files (not JSON, CSS, md, etc.)
if (!/\.(ts|tsx)$/.test(filePath)) {
  process.exit(0)
}

let output = ''
let passed = false

try {
  output = execSync('npm test', {
    cwd: projectRoot,
    encoding: 'utf8',
    timeout: 120_000,
  })
  passed = true
} catch (err) {
  output = (err.stdout ?? '') + (err.stderr ?? '')
  passed = false
}

// Trim to last 4000 chars so context injection stays concise
const trimmed = output.length > 4000 ? '…' + output.slice(-4000) : output
const additionalContext = passed
  ? 'npm test: all tests passed ✓'
  : `npm test FAILED — fix these before reporting the task as done:\n\`\`\`\n${trimmed}\n\`\`\``

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext,
    },
  })
)
