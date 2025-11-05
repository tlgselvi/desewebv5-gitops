"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console
    console.error("🚨 Page Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full">
          <span className="text-3xl">⚠️</span>
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
          Something went wrong!
        </h2>
        
        <p className="text-gray-600 text-center mb-4">
          An unexpected error occurred while loading this page.
        </p>

        {process.env.NODE_ENV === "development" && (
          <div className="mb-4 p-4 bg-red-50 rounded-lg border border-red-200">
            <p className="text-sm font-mono text-red-800 break-all">
              {error.message || "Unknown error"}
            </p>
            {error.digest && (
              <p className="text-xs text-red-600 mt-2">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={reset}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Try Again
          </button>
          <button
            onClick={() => (window.location.href = "/")}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}

