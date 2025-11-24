"use client";

import { useEffect } from "react";
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
  useEffect(() => {
    // Suppress browser extension errors (especially from Google extensions)
    // These errors are harmless and come from browser extensions, not our code
    const originalError = window.console.error;
    window.console.error = (...args: unknown[]) => {
      const errorMessage = args[0]?.toString() || "";
      
      // Filter out browser extension errors and hydration warnings from extensions
      if (
        errorMessage.includes("message channel closed") ||
        errorMessage.includes("asynchronous response") ||
        errorMessage.includes("Extension context invalidated") ||
        errorMessage.includes("bis_skin_checked") ||
        errorMessage.includes("hydration") && errorMessage.includes("bis_skin")
      ) {
        // Silently ignore browser extension errors and hydration warnings
        return;
      }
      
      // Log other errors normally
      originalError.apply(console, args);
    };

    // Remove browser extension attributes that cause hydration mismatches
    // This prevents hydration errors from browser extensions (antivirus, security tools, etc.)
    const removeExtensionAttributes = () => {
      const allElements = document.querySelectorAll("[bis_skin_checked]");
      allElements.forEach((el) => {
        el.removeAttribute("bis_skin_checked");
      });
    };

    // Remove attributes after initial render
    removeExtensionAttributes();
    
    // Also remove on DOM mutations (in case extensions add them later)
    const observer = new MutationObserver(() => {
      removeExtensionAttributes();
    });
    
    observer.observe(document.body, {
      attributes: true,
      subtree: true,
      attributeFilter: ["bis_skin_checked"],
    });

    // Cleanup on unmount
    return () => {
      window.console.error = originalError;
      observer.disconnect();
    };
  }, []);

  return (
    <Providers>
      <div 
        className="relative flex min-h-screen flex-col bg-white text-gray-900"
        suppressHydrationWarning
      >
        <MainNavigation />
        <main className="relative flex-1" suppressHydrationWarning>
          <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8" suppressHydrationWarning>
            {children}
          </div>
        </main>
        <Footer />
      </div>
    </Providers>
  );
}

