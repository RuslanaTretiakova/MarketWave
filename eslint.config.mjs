import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import prettier from 'eslint-config-prettier'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  // Prevent adminClient from leaking into client components or hooks.
  // It bypasses RLS and must only appear in Server Actions or Route Handlers.
  {
    files: ['**/components/**/*.{ts,tsx}', 'hooks/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/supabase/admin*', '@/lib/supabase/admin'],
              message:
                "adminClient bypasses RLS — only import it from Server Actions ('use server') or Route Handlers.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Excluded until database.types.ts is unlocked and replaced — see database.types.new.ts
    'lib/supabase/types/database.types.ts',
  ]),
])

export default eslintConfig
