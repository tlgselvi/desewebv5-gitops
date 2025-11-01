import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from "axios";

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
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "/api/v1",
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
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

      // Clear token and redirect to login
      localStorage.removeItem("token");
      
      // Only redirect if we're not already on the login page
      if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }

      return Promise.reject(error);
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      const message = error.response.data?.message || "Access denied";
      console.error("Forbidden:", message);
      // Could show a toast notification here
    }

    // Handle 429 Too Many Requests
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers["retry-after"];
      const message = error.response.data?.message || "Too many requests. Please try again later.";
      console.warn("Rate limit exceeded:", message, retryAfter ? `Retry after ${retryAfter}s` : "");
      // Could implement exponential backoff retry here
    }

    // Handle 500+ Server Errors
    if (error.response?.status && error.response.status >= 500) {
      console.error("Server error:", error.response.data?.message || "Internal server error");
      // Could show a user-friendly error message
    }

    // Handle network errors
    if (!error.response) {
      console.error("Network error:", error.message);
      // Could show "Please check your internet connection" message
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
