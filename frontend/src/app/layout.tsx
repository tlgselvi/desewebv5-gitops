import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import Providers from "./providers"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Dese EA Plan v5",
  description: "CPT Optimization Domain & AIOps Platform",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        {/* Accessibility: Skip to main content link */}
        <link rel="preload" href="/" as="document" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        {/* ARIA live region for screen reader announcements */}
        <div
          id="a11y-live-region"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        />
        {/* Skip to main content link */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
        >
          Ana içeriğe geç
        </a>
        <Providers>
          {/* Suppress hydration warnings from browser extensions */}
          <div suppressHydrationWarning>
            {children}
          </div>
        </Providers>
      </body>
    </html>
  )
}
