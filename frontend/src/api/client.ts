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

      if (process.env.NODE_ENV === "development") {
        console.warn("🔐 Authentication Error: Token expired or invalid. Redirecting to login...");
      }

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

    // Handle 500+ Server Errors with detailed logging
    if (error.response?.status && error.response.status >= 500) {
      const errorDetails = {
        type: "Server Error",
        status: error.response.status,
        message: error.response.data?.message || "Internal server error",
        url: originalRequest?.url,
        method: originalRequest?.method?.toUpperCase(),
        timestamp: new Date().toISOString(),
        data: error.response.data,
      };

      if (process.env.NODE_ENV === "development") {
        console.group(`🚨 Server Error ${errorDetails.status}`);
        console.error("Message:", errorDetails.message);
        console.error("URL:", `${originalRequest?.baseURL}${errorDetails.url}`);
        console.error("Method:", errorDetails.method || "N/A");
        console.error("Timestamp:", errorDetails.timestamp);
        if (errorDetails.data) {
          console.error("Response Data:", errorDetails.data);
        }
        console.groupEnd();
      } else {
        console.error("Server error:", errorDetails.message);
      }
    }

    // Handle network errors with detailed logging
    if (!error.response) {
      const errorMessage = error.message || "Network error";
      const errorDetails = {
        type: "Network Error",
        message: errorMessage,
        code: error.code,
        url: originalRequest?.url,
        baseURL: originalRequest?.baseURL,
        method: originalRequest?.method?.toUpperCase(),
        timestamp: new Date().toISOString(),
        stack: error.stack,
      };

      // Detailed console logging for development
      if (process.env.NODE_ENV === "development") {
        console.group("🚨 Network Error Details");
        console.error("Type:", errorDetails.type);
        console.error("Message:", errorDetails.message);
        console.error("Code:", errorDetails.code || "N/A");
        console.error("URL:", `${errorDetails.baseURL}${errorDetails.url}`);
        console.error("Method:", errorDetails.method || "N/A");
        console.error("Timestamp:", errorDetails.timestamp);
        if (error.stack) {
          console.error("Stack:", error.stack);
        }
        console.groupEnd();
      } else {
        // Production: simple error
        console.error("Network error:", errorMessage);
      }
      
      // Provide more helpful error message
      if (error.code === "ECONNREFUSED" || errorMessage.includes("Network Error")) {
        const troubleshooting = [
          "Backend server may be down. Please check:",
          "- Backend is running on http://localhost:3001",
          "- Docker containers (PostgreSQL, Redis) are running",
          "- CORS is configured correctly",
          "- NEXT_PUBLIC_API_URL is set correctly",
          `- Current baseURL: ${getBaseURL()}`,
        ];
        
        if (process.env.NODE_ENV === "development") {
          console.group("💡 Troubleshooting Tips");
          troubleshooting.forEach((tip) => console.warn(tip));
          console.groupEnd();
        } else {
          console.error(troubleshooting.join("\n"));
        }
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
