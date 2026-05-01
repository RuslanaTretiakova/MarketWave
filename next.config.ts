import path from 'path'

import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Prevent Turbopack from treating a parent folder (e.g. extra lockfile) as the repo root.
  turbopack: {
    root: path.join(process.cwd()),
  },
}

export default nextConfig
