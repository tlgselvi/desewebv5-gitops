import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from './components/theme-provider'
import { Sidebar } from './components/sidebar'
import { Header } from './components/header'
import { WebVitalsClient } from './components/WebVitalsClient'
import { SessionProviderClient } from './components/SessionProviderClient'
import { GlobalErrorHandler } from './components/GlobalErrorHandler'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CPT AIOps Dashboard',
  description: 'Predictive Remediation & Anomaly Detection Platform',
  openGraph: {
    type: 'website',
    title: 'CPT AIOps',
    url: 'https://cpt.aiops',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <GlobalErrorHandler />
        <SessionProviderClient>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <WebVitalsClient />
            <div className="flex h-screen bg-background">
              <Sidebar />
              <div className="flex-1 flex flex-col">
                <Header />
                <main className="flex-1 overflow-auto p-6">
                  {children}
                </main>
              </div>
            </div>
          </ThemeProvider>
        </SessionProviderClient>
      </body>
    </html>
  )
}