"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState, useEffect, useRef } from "react"
import { ThemeProvider } from "@/components/theme/theme-provider"
import { Toaster } from "sonner"
import { CommandMenu } from "@/components/ui/command-menu"

/**
 * Browser extension attributes that cause hydration mismatches
 */
const EXTENSION_ATTRIBUTES = [
  "bis_skin_checked",
  "__processed_aa3a0128-bb8e-4bc0-a8bc-9ae9bbdbbf2f__",
  "bis_register",
];

/**
 * Error patterns from browser extensions to suppress
 */
const EXTENSION_ERROR_PATTERNS = [
  "message channel closed",
  "asynchronous response",
  "Extension context invalidated",
  "bis_skin_checked",
  "__processed_",
];

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
  );

  // Refs for cleanup
  const originalErrorRef = useRef<typeof console.error | null>(null);
  const observerRef = useRef<MutationObserver | null>(null);

  useEffect(() => {
    // Guard for SSR
    if (typeof window === "undefined") return;

    // Store original console.error
    originalErrorRef.current = window.console.error;

    // Suppress browser extension errors
    window.console.error = (...args: unknown[]) => {
      const errorMessage = String(args[0] || "");
      
      // Check if this is an extension-related error
      const isExtensionError = EXTENSION_ERROR_PATTERNS.some(pattern => 
        errorMessage.includes(pattern)
      );
      
      // Check for extension-related hydration warnings
      const isExtensionHydrationError = errorMessage.includes("hydration") && 
        EXTENSION_ERROR_PATTERNS.some(pattern => errorMessage.includes(pattern));
      
      if (isExtensionError || isExtensionHydrationError) {
        // Silently ignore browser extension errors
        return;
      }
      
      // Log other errors normally
      originalErrorRef.current?.apply(console, args);
    };

    // Remove browser extension attributes
    const removeExtensionAttributes = () => {
      EXTENSION_ATTRIBUTES.forEach(attr => {
        try {
          const elements = document.querySelectorAll(`[${attr}]`);
          elements.forEach((el) => {
            el.removeAttribute(attr);
          });
        } catch {
          // Ignore query selector errors
        }
      });
    };

    // Initial cleanup
    removeExtensionAttributes();
    
    // Create observer for ongoing cleanup
    observerRef.current = new MutationObserver(removeExtensionAttributes);
    
    // Start observing
    observerRef.current.observe(document.body, {
      attributes: true,
      subtree: true,
      attributeFilter: EXTENSION_ATTRIBUTES,
    });

    // Cleanup function - always runs on unmount
    return () => {
      // Restore original console.error
      if (originalErrorRef.current) {
        window.console.error = originalErrorRef.current;
        originalErrorRef.current = null;
      }
      
      // Disconnect observer
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, []);

  const [commandMenuOpen, setCommandMenuOpen] = useState(false);

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
        <CommandMenu open={commandMenuOpen} onOpenChange={setCommandMenuOpen} />
      </ThemeProvider>
    </QueryClientProvider>
  )
}
