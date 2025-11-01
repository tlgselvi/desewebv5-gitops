import Providers from "./providers";
import "./globals.css";
import type { Metadata } from "next";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export const metadata: Metadata = { 
  title: "Dese EA Plan v5.0",
  description: "CPT Optimization Domain için Kubernetes + GitOps + AIOps uyumlu kurumsal planlama sistemi"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className="bg-gray-50 text-gray-900">
        <ErrorBoundary>
          <Providers>
            <div className="flex min-h-screen">
              <Sidebar />
              <div className="flex-1 flex flex-col">
                <Header />
                <main className="flex-1 overflow-auto">
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
