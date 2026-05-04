import type { Metadata } from 'next'
import Script from 'next/script'
import { Fraunces, Inter, Roboto_Mono } from 'next/font/google'

import { metadataKeywords, SITE_NAME, SITE_TAGLINE } from '@/lib/brand'

import { Toaster } from '@/components/ui/sonner'

import './globals.css'

/** Inline extension-marker stripping runs from `/strip-extension-dom-markers.js` (Loaded via `next/script` to avoid React `<script>` + innerHTML console warnings.) */

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
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        <Script
          id="strip-extension-dom-markers"
          src="/strip-extension-dom-markers.js"
          strategy="beforeInteractive"
        />
        {children}
        <Toaster />
      </body>
    </html>
  )
}
