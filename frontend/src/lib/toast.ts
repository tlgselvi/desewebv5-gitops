/**
 * Toast Utility
 * 
 * Wrapper around sonner toast for consistent usage across the application.
 * Provides typed toast methods with consistent styling and behavior.
 */

import { toast as sonnerToast } from "sonner";

export type ToastType = "success" | "error" | "info" | "warning" | "loading";

export interface ToastOptions {
  /**
   * Toast message title
   */
  title?: string;
  
  /**
   * Toast message description
   */
  description?: string;
  
  /**
   * Duration in milliseconds (default: 4000)
   */
  duration?: number;
  
  /**
   * Whether to show close button
   */
  closeButton?: boolean;
  
  /**
   * Action button configuration
   */
  action?: {
    label: string;
    onClick: () => void;
  };
  
  /**
   * Cancel button configuration
   */
  cancel?: {
    label: string;
    onClick?: () => void;
  };
}

/**
 * Show a success toast
 */
export const toast = {
  success: (message: string, options?: ToastOptions) => {
    return sonnerToast.success(message, {
      description: options?.description,
      duration: options?.duration ?? 4000,
      closeButton: options?.closeButton ?? true,
      action: options?.action,
      cancel: options?.cancel,
    });
  },
  
  /**
   * Show an error toast
   */
  error: (message: string, options?: ToastOptions) => {
    return sonnerToast.error(message, {
      description: options?.description,
      duration: options?.duration ?? 5000,
      closeButton: options?.closeButton ?? true,
      action: options?.action,
      cancel: options?.cancel,
    });
  },
  
  /**
   * Show an info toast
   */
  info: (message: string, options?: ToastOptions) => {
    return sonnerToast.info(message, {
      description: options?.description,
      duration: options?.duration ?? 4000,
      closeButton: options?.closeButton ?? true,
      action: options?.action,
      cancel: options?.cancel,
    });
  },
  
  /**
   * Show a warning toast
   */
  warning: (message: string, options?: ToastOptions) => {
    return sonnerToast.warning(message, {
      description: options?.description,
      duration: options?.duration ?? 4000,
      closeButton: options?.closeButton ?? true,
      action: options?.action,
      cancel: options?.cancel,
    });
  },
  
  /**
   * Show a loading toast
   */
  loading: (message: string, options?: Omit<ToastOptions, "duration">) => {
    return sonnerToast.loading(message, {
      description: options?.description,
      closeButton: options?.closeButton ?? false,
    });
  },
  
  /**
   * Show a promise toast (loading -> success/error)
   */
  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: Error) => string);
    },
    options?: Omit<ToastOptions, "title" | "description">
  ) => {
    return sonnerToast.promise(promise, {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
      duration: options?.duration,
      closeButton: options?.closeButton,
    });
  },
  
  /**
   * Dismiss a toast by ID
   */
  dismiss: (toastId?: string | number) => {
    sonnerToast.dismiss(toastId);
  },
  
  /**
   * Dismiss all toasts
   */
  dismissAll: () => {
    sonnerToast.dismiss();
  },
};

/**
 * Legacy export for backward compatibility
 * @deprecated Use toast.success, toast.error, etc. instead
 */
export { toast as default };

