import type { Metadata } from 'next'
import Script from 'next/script'
import { Fraunces, Inter, Roboto_Mono } from 'next/font/google'

import { metadataKeywords, SITE_NAME, SITE_TAGLINE } from '@/lib/brand'

import './globals.css'

/** Stripped before React hydrates: some extensions inject `bis_skin_checked` onto nodes, causing mismatches vs SSR HTML. */
function stripExtensionDomMarkersScript(): string {
  return `(function(){try{function s(){document.querySelectorAll('[bis_skin_checked]').forEach(function(el){el.removeAttribute('bis_skin_checked')});}if(typeof document==="undefined")return;s();new MutationObserver(function(){s()}).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['bis_skin_checked']});s()}catch(_){}})();`
}

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
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: stripExtensionDomMarkersScript() }}
        />
        {children}
      </body>
    </html>
  )
}
