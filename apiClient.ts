type FetchOptions = RequestInit & {
  // Add any custom options here if needed
};

/**
 * A custom fetch wrapper for the frontend that automatically adds the
 * Authorization header if a token is available in localStorage.
 *
 * @param url The URL to fetch.
 * @param options The options for the fetch request.
 * @returns A Promise that resolves to the Response object.
 */
export async function apiClient(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const headers = new Headers(options.headers);

  // This code only runs on the client-side
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  // Ensure Content-Type is set for POST/PUT/PATCH requests with a body
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  return response;
}

export default apiClient;