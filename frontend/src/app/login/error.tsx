"use client";

/**
 * Login Page Error Boundary
 * Specialized error handling for authentication flow
 */

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function LoginError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("Login Error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="max-w-sm w-full text-center space-y-4">
        <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto" />
        
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Giriş Sayfası Yüklenemedi
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {error.message || "Lütfen sayfayı yenileyin."}
          </p>
        </div>

        <Button onClick={reset} className="w-full">
          <RefreshCw className="mr-2 h-4 w-4" />
          Tekrar Dene
        </Button>
      </div>
    </div>
  );
}

