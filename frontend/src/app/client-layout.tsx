"use client";

import { useEffect } from "react";
import Providers from "./providers";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { GlobalErrorHandler } from "@/components/GlobalErrorHandler";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Debug: Check if layout is rendering
    console.log("✅ ClientLayout rendered");
    console.log("✅ Providers loaded");
    console.log("✅ ErrorBoundary active");
    
    // Ensure body has correct background
    document.body.style.backgroundColor = "#f9fafb";
    document.body.style.color = "#111827";
    
    // Force remove any black background
    const html = document.documentElement;
    html.style.backgroundColor = "#f9fafb";
    
    // Check if CSS is loaded
    const stylesheets = Array.from(document.styleSheets);
    console.log(`✅ Loaded ${stylesheets.length} stylesheets`);
    
    // Check if React is rendering
    console.log("✅ React is rendering");
  }, []);

  return (
    <>
      <GlobalErrorHandler />
      <ErrorBoundary>
        <Providers>
          <div className="flex min-h-screen bg-gray-50" style={{ backgroundColor: "#f9fafb", minHeight: "100vh" }}>
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
              <Header />
              <main className="flex-1 overflow-auto bg-gray-50" style={{ backgroundColor: "#f9fafb" }}>
                {children}
              </main>
            </div>
          </div>
        </Providers>
      </ErrorBoundary>
    </>
  );
}

