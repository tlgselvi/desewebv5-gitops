"use client";

import type { ReactNode } from "react";
import MainNavigation from "@/components/layout/MainNavigation";
import Footer from "@/components/layout/Footer";
import Providers from "./providers";

interface ClientLayoutProps {
  readonly children: ReactNode;
}

export default function ClientLayout({
  children,
}: ClientLayoutProps) {
  return (
    <Providers>
      <div className="relative flex min-h-screen flex-col bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100">
        <MainNavigation />
        <main className="relative flex-1">
          <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
        <Footer />
      </div>
    </Providers>
  );
}

