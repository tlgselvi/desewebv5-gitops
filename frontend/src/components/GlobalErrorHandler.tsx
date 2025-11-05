"use client";

import { useEffect } from 'react';

export function GlobalErrorHandler() {
  useEffect(() => {
    // Global error handler
    const handleError = (event: ErrorEvent) => {
      console.error('🚨 Global Error:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
        stack: event.error?.stack,
      });
      
      // Show error in UI (Next.js error overlay will handle this, but we log it too)
      if (process.env.NODE_ENV === 'development') {
        console.group('🐛 Error Details');
        console.error('Message:', event.message);
        console.error('File:', event.filename);
        console.error('Line:', event.lineno);
        console.error('Column:', event.colno);
        console.error('Stack:', event.error?.stack);
        console.groupEnd();
      }
    };

    // Unhandled promise rejection
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('🚨 Unhandled Promise Rejection:', {
        reason: event.reason,
        promise: event.promise,
      });
      
      if (process.env.NODE_ENV === 'development') {
        console.group('🐛 Unhandled Promise Rejection');
        console.error('Reason:', event.reason);
        if (event.reason instanceof Error) {
          console.error('Stack:', event.reason.stack);
        }
        console.groupEnd();
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return null;
}

