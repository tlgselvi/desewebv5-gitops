import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from "axios";
import { logger } from "@/utils/logger";

export interface ApiError {
  error: string;
  message: string;
  details?: {
    issues?: Array<{
      field: string;
      message: string;
      code: string;
    }>;
  };
  timestamp?: string;
  path?: string;
}

// Create axios instance with default config
const getBaseURL = () => {
  // In development, use full URL if NEXT_PUBLIC_API_URL is set
  if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  // Default to backend port 3001 in development
  return typeof window !== "undefined" 
    ? process.env.NODE_ENV === 'development'
      ? "http://localhost:3001/api/v1"
      : `${window.location.protocol}//${window.location.host}/api/v1`
    : "/api/v1";
};

export const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - Add auth token and dev headers
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add dev mode header for CLI authentication bypass
    if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
      if (config.headers) {
        config.headers["X-Master-Control-CLI"] = "true";
      }
    }

    const token = localStorage.getItem("token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Handle 401 Unauthorized - Token expired or invalid
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      logger.warn("Authentication Error: Token expired or invalid. Redirecting to login...", {
        url: originalRequest?.url,
        method: originalRequest?.method,
      });

      // Clear token and redirect to login
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        
        // Only redirect if we're not already on the login page
        if (!window.location.pathname.includes("/login")) {
          window.location.href = "/login";
        }
      }

      return Promise.reject(error);
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      const message = error.response.data?.message || "Access denied";
      logger.error("Forbidden", {
        message,
        url: originalRequest?.url,
        method: originalRequest?.method,
      });
      // Could show a toast notification here
    }

    // Handle 429 Too Many Requests
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers["retry-after"];
      const message = error.response.data?.message || "Too many requests. Please try again later.";
      logger.warn("Rate limit exceeded", {
        message,
        retryAfter,
        url: originalRequest?.url,
        method: originalRequest?.method,
      });
      // Could implement exponential backoff retry here
    }

    // Handle 500+ Server Errors with detailed logging
    if (error.response?.status && error.response.status >= 500) {
      const errorDetails = {
        type: "Server Error",
        status: error.response.status,
        message: error.response.data?.message || "Internal server error",
        url: originalRequest?.url,
        baseURL: originalRequest?.baseURL,
        method: originalRequest?.method?.toUpperCase(),
        data: error.response.data,
      };

      logger.group(`Server Error ${errorDetails.status}`, () => {
        logger.error("Server error occurred", {
          status: errorDetails.status,
          message: errorDetails.message,
          url: `${errorDetails.baseURL}${errorDetails.url}`,
          method: errorDetails.method || "N/A",
          responseData: errorDetails.data,
        });
      });
    }

    // Handle network errors with detailed logging
    if (!error.response) {
      const errorMessage = error.message || "Network error";
      const fullUrl = `${originalRequest?.baseURL || ''}${originalRequest?.url || ''}`;
      const errorDetails = {
        type: "Network Error",
        message: errorMessage,
        code: error.code,
        url: originalRequest?.url,
        baseURL: originalRequest?.baseURL,
        fullUrl,
        method: originalRequest?.method?.toUpperCase(),
      };

      // Log network error with context (only in development)
      // Note: Network errors are expected when backend is down, so we log them gracefully
      if (process.env.NODE_ENV === "development") {
        logger.group("⚠️ Network Error (Backend may be offline)", () => {
          logger.error("Request failed", {
            method: errorDetails.method,
            url: errorDetails.fullUrl,
            code: errorDetails.code,
            message: errorDetails.message,
          });
          
          // Provide troubleshooting tips for common network errors
          if (error.code === "ECONNREFUSED" || errorMessage.includes("Network Error") || error.code === "ERR_NETWORK") {
            logger.warn("💡 Troubleshooting", {
              currentBaseURL: getBaseURL(),
              configuredApiUrl: process.env.NEXT_PUBLIC_API_URL || "not set",
              check: [
                "✓ Backend server running on http://localhost:3001?",
                "✓ Docker containers (PostgreSQL, Redis) running?",
                "✓ CORS configured correctly?",
                "✓ NEXT_PUBLIC_API_URL set correctly?",
              ],
            });
          }
        });
      } else {
        // In production, log more concisely
        logger.error("Network request failed", {
          code: error.code,
          url: originalRequest?.url,
        });
      }
    }

    return Promise.reject(error);
  }
);

// Helper function to extract error message
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiError>(error)) {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.response?.data?.error) {
      return error.response.data.error;
    }
    if (error.message) {
      return error.message;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred";
}

// Helper function to extract validation errors
export function getValidationErrors(error: unknown): Array<{ field: string; message: string }> {
  if (axios.isAxiosError<ApiError>(error)) {
    return error.response?.data?.details?.issues?.map((issue) => ({
      field: issue.field,
      message: issue.message,
    })) || [];
  }
  return [];
}

// Retry helper for failed requests
export async function retryRequest<T>(
  requestFn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;

      // Don't retry on 4xx errors (except 429)
      if (axios.isAxiosError(error) && error.response?.status) {
        const status = error.response.status;
        if (status >= 400 && status < 500 && status !== 429) {
          throw error; // Don't retry client errors
        }
      }

      if (attempt < maxRetries) {
        const backoffDelay = delay * Math.pow(2, attempt - 1); // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
      }
    }
  }

  throw lastError;
}

// API methods with proper typing
export const apiMethods = {
  get: <T = any>(url: string, config?: AxiosRequestConfig) =>
    api.get<T>(url, config).then((res) => res.data),

  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    api.post<T>(url, data, config).then((res) => res.data),

  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    api.put<T>(url, data, config).then((res) => res.data),

  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    api.patch<T>(url, data, config).then((res) => res.data),

  delete: <T = any>(url: string, config?: AxiosRequestConfig) =>
    api.delete<T>(url, config).then((res) => res.data),
};

// Export default api for backward compatibility
export default api;
