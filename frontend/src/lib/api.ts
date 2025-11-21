import { getToken } from "./auth";

/**
 * Get the base API URL from environment variable or use default
 */
const getBaseUrl = (): string => {
  if (typeof window !== "undefined") {
    // Client-side: use environment variable
    return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";
  }
  // Server-side: use environment variable or default
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";
};

/**
 * Resolve full URL from path (handles both absolute and relative paths)
 * Prevents duplicate /api/v1 in the final URL
 */
const resolveUrl = (url: string): string => {
  // If URL is already absolute (starts with http:// or https://), use it as-is
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  
  const baseUrl = getBaseUrl().replace(/\/$/, ""); // Remove trailing slash from base
  
  // If URL starts with /, it's an absolute path
  if (url.startsWith("/")) {
    // Check if base URL already ends with /api/v1 and path also starts with /api/v1
    // If so, remove the duplicate /api/v1 from the path
    if (baseUrl.endsWith("/api/v1") && url.startsWith("/api/v1")) {
      // Remove /api/v1 from the beginning of the path
      const cleanPath = url.replace(/^\/api\/v1/, "");
      return `${baseUrl}${cleanPath}`;
    }
    return `${baseUrl}${url}`;
  }
  
  // Relative path - prepend base URL with /
  return `${baseUrl}/${url}`;
};

/**
 * Authenticated fetch wrapper that automatically adds Authorization header
 * to all API requests using the token from localStorage.
 *
 * @param url - The URL to fetch from (can be absolute URL or path like "/api/v1/endpoint")
 * @param options - Optional fetch options (headers, method, body, etc.)
 * @returns Promise<Response> - The fetch response
 * @throws Error if token is not found or request fails
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = getToken();

  if (!token) {
    throw new Error("Authentication token not found. Please log in again.");
  }

  // Resolve full URL
  const fullUrl = resolveUrl(url);

  // Merge headers, ensuring Authorization is set
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Content-Type", "application/json");

  // Create the request with merged options
  const response = await fetch(fullUrl, {
    ...options,
    headers,
  });

  // Handle 401 Unauthorized errors
  if (response.status === 401) {
    // Optionally clear token and redirect to login
    localStorage.removeItem("token");
    throw new Error("Session expired. Please log in again.");
  }

  return response;
}

/**
 * Convenience method for authenticated GET requests
 */
export async function authenticatedGet<T>(url: string): Promise<T> {
  const response = await authenticatedFetch(url, {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

/**
 * Convenience method for authenticated POST requests
 */
export async function authenticatedPost<T>(
  url: string,
  body?: unknown,
): Promise<T> {
  const response = await authenticatedFetch(url, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

