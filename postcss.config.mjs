import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** Stable project root — `process.cwd()` can be wrong for Turbopack/PostCSS on Windows. */
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)))

const config = {
  plugins: {
    '@tailwindcss/postcss': {
      base: projectRoot,
    },
  },
}

export default config
