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
    // Instead of throwing, return a response that indicates an auth failure.
    // This allows the caller to handle it gracefully (e.g., redirect to login).
    return new Response(JSON.stringify({ error: "Authentication token not found." }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
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
    console.warn("Session expired or token is invalid. Clearing token.");
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      window.location.href = '/login?session=expired';
    }
    throw new Error("Session expired. Please log in again."); // This will be caught by the redirect
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
    // If the custom 401 response from above is returned, handle it.
    if (response.status === 401) {
      console.error("Authentication required. Redirecting to login.");
      // Redirect to login page
      window.location.href = '/login';
    }
    // Handle 403 Forbidden (authorization failed)
    if (response.status === 403) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || errorData.error || "You don't have permission to access this resource.";
      console.error("Authorization failed:", errorMessage);
      throw new Error(`Access denied: ${errorMessage}`);
    }
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
    // Handle the custom 401 response here as well
    if (response.status === 401) {
      console.error("Authentication required. Redirecting to login.");
      // Redirect to login page
      window.location.href = '/login';
    }
    // Handle 403 Forbidden (authorization failed)
    if (response.status === 403) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || errorData.error || "You don't have permission to access this resource.";
      console.error("Authorization failed:", errorMessage);
      throw new Error(`Access denied: ${errorMessage}`);
    }
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

/**
 * Convenience method for authenticated PATCH requests
 */
export async function authenticatedPatch<T>(
  url: string,
  body?: unknown,
): Promise<T> {
  const response = await authenticatedFetch(url, {
    method: "PATCH",
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    // Handle the custom 401 response here as well
    if (response.status === 401) {
      console.error("Authentication required. Redirecting to login.");
      // Redirect to login page
      window.location.href = '/login';
    }
    // Handle 403 Forbidden (authorization failed)
    if (response.status === 403) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || errorData.error || "You don't have permission to access this resource.";
      console.error("Authorization failed:", errorMessage);
      throw new Error(`Access denied: ${errorMessage}`);
    }
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}