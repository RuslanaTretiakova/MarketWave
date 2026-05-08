import type { Metadata } from 'next'
import Script from 'next/script'
import { Fraunces, Inter, Roboto_Mono } from 'next/font/google'

import { metadataKeywords, SITE_NAME, SITE_TAGLINE } from '@/lib/brand'

import { AuthSessionHashHandler } from '@/components/auth/auth-session-hash-handler'
import { Toaster } from '@/components/ui/sonner'

import './globals.css'

/** Pre-hydration scripts are loaded from static files in `public/`. */

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
})

const fraunces = Fraunces({
  variable: '--font-fraunces',
  subsets: ['latin'],
})

/** UI monospace stack uses Roboto Mono (`--font-roboto-mono`); identifier name kept as `geistMono` for stable layout bindings. */
const geistMono = Roboto_Mono({
  variable: '--font-roboto-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_TAGLINE,
  keywords: metadataKeywords,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${fraunces.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <Script src="/supabase-recovery-hash-redirect.js" strategy="beforeInteractive" />
        <Script src="/strip-extension-dom-markers.js" strategy="beforeInteractive" />
      </head>
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        <AuthSessionHashHandler />
        {children}
        <Toaster />
      </body>
    </html>
  )
}
