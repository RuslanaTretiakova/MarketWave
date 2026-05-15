import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { NextConfig } from 'next'

/** Absolute repo root — `process.cwd()` can be wrong for Turbopack on Windows while resolving CSS @imports. */
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)))

/**
 * Client bundles only inline `NEXT_PUBLIC_*`. Map CLI/Vercel-style `SUPABASE_URL` + `SUPABASE_KEY`
 * (anon) into those names at build time when the prefixed vars are unset.
 */
const nextPublicSupabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim() || ''
const nextPublicSupabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || process.env.SUPABASE_KEY?.trim() || ''

const nextConfig: NextConfig = {
  devIndicators: false,
  env: {
    NEXT_PUBLIC_SUPABASE_URL: nextPublicSupabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: nextPublicSupabaseAnonKey,
  },
  async redirects() {
    return [
      /** Canonical profile settings live under Settings — fixes bookmarks / old links to `/profile`. */
      { source: '/profile', destination: '/settings/profile', permanent: false },
      {
        source: '/profile/:path*',
        destination: '/settings/profile',
        permanent: false,
      },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/**',
      },
      /** Local Supabase (`supabase start`) — avoids blocking optimized assets if any use `next/image`. */
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '54321',
        pathname: '/storage/v1/object/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '54321',
        pathname: '/storage/v1/object/**',
      },
    ],
  },
  turbopack: {
    root: projectRoot,
    resolveAlias: {
      /** Avoid resolving `tailwindcss` from wrong cwd during PostCSS/CSS processing (dashboard route, etc.). */
      tailwindcss: path.join(projectRoot, 'node_modules', 'tailwindcss'),
    },
  },
}

export default nextConfig
