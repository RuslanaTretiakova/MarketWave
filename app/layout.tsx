import type { Metadata } from 'next'
import { Fraunces, Inter, Roboto_Mono } from 'next/font/google'

import { metadataKeywords, SITE_NAME, SITE_TAGLINE } from '@/lib/brand'

import { AuthSessionHashHandler } from '@/components/auth/auth-session-hash-handler'
import { Toaster } from '@/components/ui/sonner'

import './globals.css'

const STRIP_EXTENSION_ATTRS_SCRIPT = `
(() => {
  const ATTRS = [
    'bis_skin_checked',
    'bis_register',
    'cz-shortcut-listen',
    'data-new-gr-c-s-check-loaded',
    'data-gr-ext-installed',
    'data-gr-ext-disabled',
    'data-lt-installed',
  ];
  const PREFIXES = ['__processed_', 'bis_'];
  const stripNode = (node) => {
    if (!node.attributes) return;
    for (const attr of ATTRS) {
      if (node.hasAttribute(attr)) node.removeAttribute(attr);
    }
    for (let i = node.attributes.length - 1; i >= 0; i--) {
      const name = node.attributes[i].name;
      if (PREFIXES.some((p) => name.startsWith(p))) {
        node.removeAttribute(name);
      }
    }
  };
  const stripAll = () => {
    stripNode(document.documentElement);
    if (document.body) stripNode(document.body);
    document.querySelectorAll('*').forEach(stripNode);
  };
  stripAll();
  new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'attributes' && m.target instanceof Element) {
        stripNode(m.target);
      }
    }
  }).observe(document.documentElement, { attributes: true, subtree: true });
})();
`

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
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: STRIP_EXTENSION_ATTRS_SCRIPT }}
        />
      </head>
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        <AuthSessionHashHandler />
        {children}
        <Toaster />
      </body>
    </html>
  )
}
