"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState, useEffect } from "react"
import { ThemeProvider } from "@/components/theme/theme-provider"
import { Toaster } from "sonner"

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  )

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
        errorMessage.includes("__processed_") ||
        (errorMessage.includes("hydration") && (
          errorMessage.includes("bis_skin") ||
          errorMessage.includes("__processed_")
        ))
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
      // Remove common browser extension attributes
      const attributesToRemove = [
        "bis_skin_checked",
        "__processed_aa3a0128-bb8e-4bc0-a8bc-9ae9bbdbbf2f__",
        "bis_register"
      ];
      
      attributesToRemove.forEach(attr => {
        const elements = document.querySelectorAll(`[${attr}]`);
        elements.forEach((el) => {
          el.removeAttribute(attr);
        });
      });
    };

    // Remove attributes after initial render
    if (typeof window !== "undefined") {
      removeExtensionAttributes();
      
      // Also remove on DOM mutations (in case extensions add them later)
      const observer = new MutationObserver(() => {
        removeExtensionAttributes();
      });
      
      observer.observe(document.body, {
        attributes: true,
        subtree: true,
        attributeFilter: ["bis_skin_checked", "__processed_aa3a0128-bb8e-4bc0-a8bc-9ae9bbdbbf2f__", "bis_register"],
      });

      // Cleanup on unmount
      return () => {
        window.console.error = originalError;
        observer.disconnect();
      };
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
        <Toaster richColors closeButton position="top-right" />
      </ThemeProvider>
    </QueryClientProvider>
  )
}
