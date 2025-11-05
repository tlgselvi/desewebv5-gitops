import Providers from "./providers";
import "./globals.css";
import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { GlobalErrorHandler } from "@/components/GlobalErrorHandler";

export const metadata: Metadata = { 
  title: "Dese EA Plan v6.7.0",
  description: "CPT Optimization Domain için Kubernetes + GitOps + AIOps uyumlu kurumsal planlama sistemi"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className="h-full">
      <body className="h-full bg-gray-50 text-gray-900 antialiased" suppressHydrationWarning>
        <GlobalErrorHandler />
        <ErrorBoundary>
          <Providers>
            <div className="flex min-h-screen bg-gray-50">
              <Sidebar />
              <div className="flex-1 flex flex-col min-w-0">
                <Header />
                <main className="flex-1 overflow-auto bg-gray-50">
                  {children}
                </main>
              </div>
            </div>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
