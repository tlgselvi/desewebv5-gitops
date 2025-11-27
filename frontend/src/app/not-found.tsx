/**
 * 404 Not Found Page
 * Displayed when a user navigates to a non-existent route
 */

import Link from "next/link";
import { FileQuestion, Home, ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-md w-full text-center space-y-8">
        {/* 404 Visual */}
        <div className="relative">
          <div className="text-[150px] font-bold text-gray-200 dark:text-gray-800 leading-none select-none">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <FileQuestion className="h-10 w-10 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>
        
        {/* Message */}
        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Sayfa Bulunamadı
          </h1>
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
            Aradığınız sayfa mevcut değil veya taşınmış olabilir. 
            URL&apos;yi kontrol edin veya aşağıdaki seçeneklerden birini kullanın.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button size="lg" asChild>
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Ana Sayfa
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Dashboard
            </Link>
          </Button>
        </div>

        {/* Quick Links */}
        <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Popüler Sayfalar
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Link 
              href="/mcp/finbot" 
              className="text-sm px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              FinBot
            </Link>
            <Link 
              href="/mcp/aiops" 
              className="text-sm px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              AIOps
            </Link>
            <Link 
              href="/mcp/iot" 
              className="text-sm px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              IoT
            </Link>
            <Link 
              href="/dashboard/settings" 
              className="text-sm px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Ayarlar
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

