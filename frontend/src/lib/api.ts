import { getToken } from "./auth";

/**
 * Authenticated fetch wrapper that automatically adds Authorization header
 * to all API requests using the token from localStorage.
 *
 * @param url - The URL to fetch from
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

  // Merge headers, ensuring Authorization is set
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Content-Type", "application/json");

  // Create the request with merged options
  const response = await fetch(url, {
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

