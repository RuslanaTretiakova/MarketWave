import 'server-only'

import { appendFile } from 'node:fs/promises'
import path from 'path'

/** NDJSON to project root; enable with `DEBUG_AGENT_SESSION=6cb796`. After changing call sites, run `npm run build` before `next start` so `.next` includes this instrumentation. */
export function agentDebugLog(entry: Record<string, unknown>) {
  if (process.env.DEBUG_AGENT_SESSION !== '6cb796') return

  const line =
    JSON.stringify({
      sessionId: '6cb796',
      timestamp: Date.now(),
      ...entry,
    }) + '\n'

  void appendFile(path.join(process.cwd(), 'debug-6cb796.log'), line).catch(() => {})
}
