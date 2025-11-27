"use client";

/**
 * Global Error Boundary
 * Catches unhandled errors at the root level
 * Provides user-friendly error UI with recovery options
 */

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log to error monitoring service
    console.error("Global Application Error:", {
      message: error.message,
      stack: error.stack,
      digest: error.digest,
    });
    
    // TODO: Integrate with Sentry or similar service
    // Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Error Icon */}
        <div className="mx-auto w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center animate-pulse">
          <AlertTriangle className="h-10 w-10 text-red-600 dark:text-red-400" />
        </div>
        
        {/* Error Message */}
        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Beklenmeyen Bir Hata Oluştu
          </h1>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            {error.message || "Uygulama beklenmedik bir hata ile karşılaştı. Lütfen tekrar deneyin."}
          </p>
          {error.digest && (
            <p className="text-xs text-gray-500 font-mono bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-md inline-block">
              Hata ID: {error.digest}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button 
            onClick={reset} 
            variant="default"
            size="lg"
            className="min-w-[140px]"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Tekrar Dene
          </Button>
          <Button 
            variant="outline" 
            size="lg"
            className="min-w-[140px]"
            asChild
          >
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Ana Sayfa
            </Link>
          </Button>
        </div>

        {/* Help Text */}
        <p className="text-xs text-gray-500 dark:text-gray-500 pt-4">
          Sorun devam ederse lütfen{" "}
          <a 
            href="mailto:support@dese.ai" 
            className="text-blue-600 hover:underline dark:text-blue-400"
          >
            destek ekibimizle
          </a>{" "}
          iletişime geçin.
        </p>
      </div>
    </div>
  );
}

