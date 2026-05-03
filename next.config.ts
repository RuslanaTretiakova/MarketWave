import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { NextConfig } from 'next'

/** Absolute repo root — `process.cwd()` can be wrong for Turbopack on Windows while resolving CSS @imports. */
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)))

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
    resolveAlias: {
      /** Avoid resolving `tailwindcss` from wrong cwd during PostCSS/CSS processing (dashboard route, etc.). */
      tailwindcss: path.join(projectRoot, 'node_modules', 'tailwindcss'),
    },
  },
}

export default nextConfig
