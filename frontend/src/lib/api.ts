import { getToken } from "./auth";
import { useStore } from "@/store/useStore";

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
    // The browser will append this to the current origin (e.g. http://localhost:3001)
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

/**
 * Authenticated fetch wrapper
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = getToken();

  if (!token) {
    return new Response(JSON.stringify({ error: "Authentication token not found." }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const fullUrl = resolveUrl(url);
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Content-Type", "application/json");

  // Add Organization ID from store if available (Client-side only)
  if (typeof window !== "undefined") {
    try {
      // Use getState to avoid React hook rules outside components
      const orgId = useStore.getState().user?.organizationId;
      if (orgId) {
        headers.set("x-organization-id", orgId);
      }
    } catch (e) {
      // Ignore store errors during SSR or initialization
    }
  }

  const response = await fetch(fullUrl, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    console.warn("Session expired or token is invalid. Clearing token.");
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      window.location.href = '/login?session=expired';
    }
    throw new Error("Session expired. Please log in again.");
  }

  return response;
}

export async function authenticatedGet<T>(url: string): Promise<T> {
  const response = await authenticatedFetch(url, { method: "GET" });

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") window.location.href = '/login';
    if (response.status === 403) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Access denied: ${errorData.message || "Forbidden"}`);
    }
    throw new Error(`API request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function authenticatedPost<T>(url: string, body?: unknown): Promise<T> {
  const response = await authenticatedFetch(url, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
     if (response.status === 401 && typeof window !== "undefined") window.location.href = '/login';
     throw new Error(`API request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function authenticatedPut<T>(url: string, body?: unknown): Promise<T> {
  const response = await authenticatedFetch(url, {
    method: "PUT",
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") window.location.href = '/login';
    throw new Error(`API request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function authenticatedPatch<T>(url: string, body?: unknown): Promise<T> {
  const response = await authenticatedFetch(url, {
    method: "PATCH",
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") window.location.href = '/login';
    throw new Error(`API request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function authenticatedDelete(url: string): Promise<void> {
  const response = await authenticatedFetch(url, {
    method: "DELETE",
  });

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") window.location.href = '/login';
    if (response.status === 403) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Access denied: ${errorData.message || "Forbidden"}`);
    }
    throw new Error(`API request failed: ${response.status}`);
  }
  
  // DELETE requests may not have a body
  if (response.status === 204) {
    return;
  }
  
  // If there's a body, try to parse it (some APIs return data on DELETE)
  const text = await response.text();
  if (text) {
    try {
      return JSON.parse(text) as void;
    } catch {
      return;
    }
  }
}

export const api = {
  post: async (url: string, body: any) => {
    const fullUrl = resolveUrl(url);
    console.log("Making API request to:", fullUrl);
    
    try {
      const response = await fetch(fullUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Request failed with status ${response.status}`);
      }
      return { data: await response.json() };
    } catch (err) {
      console.error("API request failed:", err);
      throw err;
    }
  },
  get: async (url: string) => {
    const fullUrl = resolveUrl(url);
    const response = await fetch(fullUrl, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    return { data: await response.json() };
  }
};
