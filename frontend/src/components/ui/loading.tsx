"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

/**
 * Loading Component
 * 
 * Displays a loading spinner with optional text.
 * Supports different sizes and variants.
 */
export interface LoadingProps {
  /**
   * Size of the loading spinner
   */
  size?: "sm" | "md" | "lg";
  
  /**
   * Variant of the loading display
   */
  variant?: "spinner" | "dots" | "pulse";
  
  /**
   * Optional text to display below the spinner
   */
  text?: string;
  
  /**
   * Whether to show full screen overlay
   */
  fullScreen?: boolean;
  
  /**
   * Additional className
   */
  className?: string;
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-8 w-8",
  lg: "h-12 w-12",
};

const textSizeClasses = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
};

export const Loading: React.FC<LoadingProps> = ({
  size = "md",
  variant = "spinner",
  text,
  fullScreen = false,
  className,
}) => {
  const content = (
    <div className={cn("flex flex-col items-center justify-center gap-2", className)}>
      {variant === "spinner" && (
        <Loader2 className={cn("animate-spin text-primary", sizeClasses[size])} />
      )}
      {variant === "dots" && (
        <div className={cn("flex gap-1", sizeClasses[size])}>
          <div className="h-full w-full rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
          <div className="h-full w-full rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
          <div className="h-full w-full rounded-full bg-primary animate-bounce" />
        </div>
      )}
      {variant === "pulse" && (
        <div className={cn("rounded-full bg-primary animate-pulse", sizeClasses[size])} />
      )}
      {text && (
        <p className={cn("text-muted-foreground", textSizeClasses[size])}>{text}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return content;
};

/**
 * Loading Spinner - Simple spinner component
 */
export const LoadingSpinner: React.FC<Omit<LoadingProps, "variant">> = (props) => (
  <Loading {...props} variant="spinner" />
);

/**
 * Loading Dots - Animated dots component
 */
export const LoadingDots: React.FC<Omit<LoadingProps, "variant">> = (props) => (
  <Loading {...props} variant="dots" />
);

/**
 * Loading Pulse - Pulsing circle component
 */
export const LoadingPulse: React.FC<Omit<LoadingProps, "variant">> = (props) => (
  <Loading {...props} variant="pulse" />
);

