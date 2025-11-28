/**
 * API Client Module
 * 
 * Provides authenticated HTTP methods with centralized error handling.
 * All API requests go through this module for consistent behavior.
 */

import { getToken } from "./auth";
import { useStore } from "@/store/useStore";
import { logger } from "./logger";

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export interface ApiErrorResponse {
  message?: string;
  error?: string;
  statusCode?: number;
  details?: unknown;
}

// =============================================================================
// CUSTOM ERROR CLASS
// =============================================================================

/**
 * Custom API Error class with status code and structured data
 */
export class ApiError extends Error {
  public readonly status: number;
  public readonly data?: ApiErrorResponse;
  public readonly isAuthError: boolean;

  constructor(message: string, status: number, data?: ApiErrorResponse) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.isAuthError = status === 401 || status === 403;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  /**
   * Check if error is a specific HTTP status
   */
  is(status: number): boolean {
    return this.status === status;
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    switch (this.status) {
      case 400:
        return this.data?.message || 'Geçersiz istek. Lütfen girdiğiniz bilgileri kontrol edin.';
      case 401:
        return 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.';
      case 403:
        return this.data?.message || 'Bu işlem için yetkiniz bulunmuyor.';
      case 404:
        return this.data?.message || 'İstenen kaynak bulunamadı.';
      case 409:
        return this.data?.message || 'Bu kayıt zaten mevcut.';
      case 422:
        return this.data?.message || 'Girilen veriler geçersiz.';
      case 429:
        return 'Çok fazla istek gönderildi. Lütfen biraz bekleyin.';
      case 500:
      case 502:
      case 503:
        return 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.';
      default:
        return this.data?.message || this.message || 'Bir hata oluştu.';
    }
  }
}

// =============================================================================
// URL UTILITIES
// =============================================================================

/**
 * Get the base API URL from environment variable or use default
 * 
 * RELATIVE PATH STRATEGY:
 * Instead of hardcoding localhost:3000 or host.docker.internal:3000, we use relative paths
 * starting with /api/v1. This allows the Next.js proxy (rewrites) to handle the routing
 * to the backend, avoiding CORS and mixed content issues.
 */
const getBaseUrl = (): string => {
  if (typeof window !== "undefined") {
    // Client-side: return empty string to use relative path
    return "";
  }
  // Server-side (SSR) - Use internal docker network name
  return process.env.INTERNAL_API_URL || "http://app:3000";
};

/**
 * Resolve full URL from path
 */
const resolveUrl = (url: string): string => {
  // If URL is already absolute, use it as-is
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  
  const baseUrl = getBaseUrl();
  
  // Ensure path starts with /api/v1
  let path = url;
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  
  // If path doesn't start with /api/v1, prepend it
  if (!path.startsWith("/api/v1")) {
    path = `/api/v1${path}`;
  }
  
  return `${baseUrl}${path}`;
};

// =============================================================================
// RESPONSE HANDLING
// =============================================================================

/**
 * Handle redirect to login page
 */
function redirectToLogin(reason: string = 'expired'): void {
  if (typeof window !== "undefined" && !window.location.href.includes('/login')) {
    localStorage.removeItem("token");
    window.location.href = `/login?session=${reason}`;
  }
}

/**
 * Centralized response handler
 * Parses response and throws ApiError for non-OK responses
 */
async function handleResponse<T>(response: Response): Promise<T> {
  // Success cases
  if (response.ok) {
    // 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    // Try to parse JSON
    const text = await response.text();
    if (!text) {
      return undefined as T;
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      logger.warn('Response is not valid JSON', { text: text.substring(0, 100) });
      return text as unknown as T;
    }
  }

  // Error cases - parse error response
  let errorData: ApiErrorResponse = {};
  try {
    const text = await response.text();
    if (text) {
      errorData = JSON.parse(text);
    }
  } catch {
    // Response is not JSON
  }

  const errorMessage = errorData.message || errorData.error || `Request failed: ${response.status}`;

  // Handle specific status codes
  switch (response.status) {
    case 401:
      logger.warn('Authentication failed - session expired or invalid token');
      redirectToLogin('expired');
      throw new ApiError('Oturumunuz sona erdi.', 401, errorData);

    case 403:
      logger.warn('Access denied', { url: response.url });
      throw new ApiError(errorMessage, 403, errorData);

    case 404:
      throw new ApiError(errorMessage, 404, errorData);

    case 422:
      throw new ApiError(errorMessage, 422, errorData);

    case 429:
      logger.warn('Rate limit exceeded');
      throw new ApiError('Çok fazla istek. Lütfen bekleyin.', 429, errorData);

    default:
      logger.error('API request failed', new Error(errorMessage), {
        status: response.status,
        url: response.url,
      });
      throw new ApiError(errorMessage, response.status, errorData);
  }
}

// =============================================================================
// MOCK MODE SUPPORT
// =============================================================================

/**
 * Guard flag to prevent infinite loops when creating mock tokens
 * This ensures ensureMockToken() only attempts to create a token once per session
 */
let mockTokenCreationAttempted = false;

/**
 * Check if mock login is enabled
 * Checks both environment variable and localStorage flag
 */
function isMockModeEnabled(): boolean {
  if (typeof window === "undefined") return false;
  
  // Check environment variable (set at build time)
  if (process.env.NEXT_PUBLIC_ENABLE_MOCK_LOGIN === "true") {
    return true;
  }
  
  // Check localStorage flag (can be set dynamically)
  if (localStorage.getItem("mock_mode") === "true") {
    return true;
  }
  
  // In development mode, default to true if no explicit setting
  if (process.env.NODE_ENV === "development") {
    // Check if backend mock login is likely enabled by checking if we're in dev
    // This is a heuristic - in dev, we assume mock mode is available
    return true;
  }
  
  return false;
}

/**
 * Create a mock token for development/testing
 * This token is a simple JWT-like structure that the backend can accept in mock mode
 */
function createMockToken(): string {
  // Create a simple mock JWT token
  // Format: header.payload.signature (base64 encoded)
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify({
    sub: "mock-user@dese.ai",
    email: "mock-user@dese.ai",
    role: "admin",
    organizationId: "mock-org-id",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
  }));
  const signature = btoa("mock-signature");
  return `${header}.${payload}.${signature}`;
}

/**
 * Ensure mock token exists in localStorage if mock mode is enabled
 * Uses a guard flag to prevent infinite loops - only attempts once per session
 */
function ensureMockToken(): string | null {
  if (typeof window === "undefined") return null;
  
  // Guard: If we've already attempted to create a token, don't try again
  // This prevents infinite loops when token creation triggers re-renders
  if (mockTokenCreationAttempted) {
    // Just return existing token if available, don't create new one
    return getToken();
  }
  
  if (isMockModeEnabled()) {
    let token = getToken();
    
    // If no token exists, create and store a mock token (only once)
    if (!token) {
      // Set guard flag BEFORE creating token to prevent re-entry
      mockTokenCreationAttempted = true;
      
      token = createMockToken();
      localStorage.setItem("token", token);
      // Also set cookie for middleware
      document.cookie = `token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
      logger.info("Mock token created and stored");
    } else {
      // Token exists, mark as attempted so we don't try again
      mockTokenCreationAttempted = true;
    }
    
    return token;
  }
  
  return null;
}

// =============================================================================
// AUTHENTICATED FETCH
// =============================================================================

/**
 * Authenticated fetch wrapper
 * Adds Authorization header and organization ID
 * In mock mode, automatically creates a mock token if none exists
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  // Try to get existing token or create mock token if in mock mode
  let token = getToken();
  
  if (!token) {
    // If mock mode is enabled, create and use a mock token
    const mockToken = ensureMockToken();
    if (mockToken) {
      token = mockToken;
      logger.debug('Using mock token for authenticated request');
    } else {
      logger.warn('No authentication token found and mock mode is disabled');
      throw new ApiError('Kimlik doğrulama gerekli.', 401);
    }
  }

  const fullUrl = resolveUrl(url);
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Content-Type", "application/json");

  // Add Organization ID from store if available (Client-side only)
  if (typeof window !== "undefined") {
    try {
      const orgId = useStore.getState().user?.organizationId;
      if (orgId) {
        headers.set("x-organization-id", orgId);
      }
    } catch {
      // Ignore store errors during SSR or initialization
    }
  }

  logger.debug('API Request', { method: options.method || 'GET', url: fullUrl });

  const response = await fetch(fullUrl, {
    ...options,
    headers,
  });

  return response;
}

// =============================================================================
// HTTP METHODS
// =============================================================================

/**
 * Authenticated GET request
 */
export async function authenticatedGet<T>(url: string): Promise<T> {
  const response = await authenticatedFetch(url, { method: "GET" });
  return handleResponse<T>(response);
}

/**
 * Authenticated POST request
 */
export async function authenticatedPost<T>(url: string, body?: unknown): Promise<T> {
  const response = await authenticatedFetch(url, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(response);
}

/**
 * Authenticated PUT request
 */
export async function authenticatedPut<T>(url: string, body?: unknown): Promise<T> {
  const response = await authenticatedFetch(url, {
    method: "PUT",
    body: body ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(response);
}

/**
 * Authenticated PATCH request
 */
export async function authenticatedPatch<T>(url: string, body?: unknown): Promise<T> {
  const response = await authenticatedFetch(url, {
    method: "PATCH",
    body: body ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(response);
}

/**
 * Authenticated DELETE request
 */
export async function authenticatedDelete<T = void>(url: string): Promise<T> {
  const response = await authenticatedFetch(url, {
    method: "DELETE",
  });
  return handleResponse<T>(response);
}

// =============================================================================
// PUBLIC API (No Auth Required)
// =============================================================================

/**
 * Public API methods (no authentication required)
 */
export const api = {
  /**
   * Public POST request
   */
  post: async <T>(url: string, body: unknown): Promise<{ data: T }> => {
    const fullUrl = resolveUrl(url);
    logger.debug('Public API POST', { url: fullUrl });
    
    const response = await fetch(fullUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    
    const data = await handleResponse<T>(response);
    return { data };
  },

  /**
   * Public GET request
   */
  get: async <T>(url: string): Promise<{ data: T }> => {
    const fullUrl = resolveUrl(url);
    logger.debug('Public API GET', { url: fullUrl });
    
    const response = await fetch(fullUrl, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    
    const data = await handleResponse<T>(response);
    return { data };
  },
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if an error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * Get user-friendly error message from any error
 */
export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    return error.getUserMessage();
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Beklenmeyen bir hata oluştu.';
}
