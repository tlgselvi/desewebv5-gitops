"use client";

/**
 * MCP Section Error Boundary
 * Catches errors in all MCP module pages
 */

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function McpError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log MCP specific errors
    console.error("MCP Module Error:", {
      message: error.message,
      stack: error.stack,
      digest: error.digest,
      module: "mcp",
    });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="max-w-lg w-full text-center space-y-6">
        {/* Error Icon */}
        <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
        </div>
        
        {/* Error Message */}
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            MCP Modülü Yüklenemedi
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {error.message || "Bu modül yüklenirken bir hata oluştu."}
          </p>
          {error.digest && (
            <p className="text-xs text-gray-500 font-mono">
              Hata ID: {error.digest}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={reset} variant="default">
            <RefreshCw className="mr-2 h-4 w-4" />
            Tekrar Dene
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Ana Sayfaya Dön
            </Link>
          </Button>
        </div>

        {/* Additional Help */}
        <div className="text-sm text-gray-500 dark:text-gray-400 border-t pt-4 mt-4">
          <p>
            Sorun devam ederse, backend servisinin çalıştığından emin olun:
          </p>
          <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded mt-2 inline-block">
            docker compose ps
          </code>
        </div>
      </div>
    </div>
  );
}

