"use client";

/**
 * Global Error Boundary (Root Layout Level)
 * This catches errors in the root layout itself
 * Must include its own html and body tags
 */

import { AlertTriangle, RefreshCw } from "lucide-react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="tr">
      <body className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="max-w-md w-full text-center space-y-6">
            {/* Error Icon */}
            <div className="mx-auto w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="h-10 w-10 text-red-600" />
            </div>
            
            {/* Error Message */}
            <div className="space-y-3">
              <h1 className="text-2xl font-bold text-gray-900">
                Kritik Hata
              </h1>
              <p className="text-gray-600 leading-relaxed">
                Uygulama başlatılırken kritik bir hata oluştu. Lütfen sayfayı yenileyin.
              </p>
              {error.digest && (
                <p className="text-xs text-gray-500 font-mono bg-gray-100 px-3 py-1.5 rounded-md inline-block">
                  Hata ID: {error.digest}
                </p>
              )}
            </div>

            {/* Action Button */}
            <button
              onClick={reset}
              className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Sayfayı Yenile
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}

