"use client";

import * as React from "react";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Card } from "./card";

/**
 * Error State Component
 * 
 * Displays an error message with optional retry and navigation actions.
 * Supports different sizes and layouts.
 */
export interface ErrorStateProps {
  /**
   * Error title
   */
  title?: string;
  
  /**
   * Error message/description
   */
  message?: string;
  
  /**
   * Error code (optional)
   */
  code?: string | number;
  
  /**
   * Whether to show retry button
   */
  showRetry?: boolean;
  
  /**
   * Retry button click handler
   */
  onRetry?: () => void;
  
  /**
   * Whether to show home button
   */
  showHome?: boolean;
  
  /**
   * Home button click handler
   */
  onHome?: () => void;
  
  /**
   * Size variant
   */
  size?: "sm" | "md" | "lg";
  
  /**
   * Layout variant
   */
  variant?: "default" | "compact" | "minimal";
  
  /**
   * Additional className
   */
  className?: string;
  
  /**
   * Custom icon
   */
  icon?: React.ReactNode;
}

const sizeClasses = {
  sm: {
    icon: "h-8 w-8",
    title: "text-base",
    message: "text-sm",
  },
  md: {
    icon: "h-12 w-12",
    title: "text-lg",
    message: "text-base",
  },
  lg: {
    icon: "h-16 w-16",
    title: "text-xl",
    message: "text-lg",
  },
};

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Bir hata oluştu",
  message = "Lütfen daha sonra tekrar deneyin.",
  code,
  showRetry = false,
  onRetry,
  showHome = false,
  onHome,
  size = "md",
  variant = "default",
  className,
  icon,
}) => {
  const defaultIcon = <AlertCircle className={cn("text-destructive", sizeClasses[size].icon)} />;
  const displayIcon = icon || defaultIcon;

  const content = (
    <div className={cn("flex flex-col items-center justify-center gap-4 text-center", className)}>
      {displayIcon}
      
      <div className="space-y-1">
        {title && (
          <h3 className={cn("font-semibold text-foreground", sizeClasses[size].title)}>
            {title}
          </h3>
        )}
        {message && (
          <p className={cn("text-muted-foreground", sizeClasses[size].message)}>
            {message}
          </p>
        )}
        {code && (
          <p className={cn("text-xs text-muted-foreground font-mono", sizeClasses[size].message)}>
            Hata Kodu: {code}
          </p>
        )}
      </div>
      
      {(showRetry || showHome) && (
        <div className="flex gap-2 mt-2">
          {showRetry && (
            <Button
              variant="outline"
              size={size === "lg" ? "lg" : size === "sm" ? "sm" : "default"}
              onClick={onRetry}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Tekrar Dene
            </Button>
          )}
          {showHome && (
            <Button
              variant="default"
              size={size === "lg" ? "lg" : size === "sm" ? "sm" : "default"}
              onClick={onHome}
            >
              <Home className="mr-2 h-4 w-4" />
              Ana Sayfa
            </Button>
          )}
        </div>
      )}
    </div>
  );

  if (variant === "minimal") {
    return content;
  }

  if (variant === "compact") {
    return (
      <div className="p-4">
        {content}
      </div>
    );
  }

  return (
    <Card className="p-8">
      {content}
    </Card>
  );
};

/**
 * Error Boundary Fallback Component
 */
export interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary?: () => void;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetErrorBoundary,
}) => {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <ErrorState
        title="Bir şeyler yanlış gitti"
        message={error.message || "Beklenmeyen bir hata oluştu."}
        showRetry={!!resetErrorBoundary}
        onRetry={resetErrorBoundary}
        size="lg"
        variant="default"
      />
    </div>
  );
};

