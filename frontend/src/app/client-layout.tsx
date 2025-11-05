"use client";

import Providers from "./providers";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { GlobalErrorHandler } from "@/components/GlobalErrorHandler";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
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
    </>
  );
}

