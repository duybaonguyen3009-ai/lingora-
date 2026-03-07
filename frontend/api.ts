/**
 * lib/api.ts
 *
 * Base API client for communicating with the Lingora backend.
 * All data-fetching helpers should be built on top of this module.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T | null;
}

// ---------------------------------------------------------------------------
// Core fetcher
// ---------------------------------------------------------------------------

async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${path}`;

  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  const json: ApiResponse<T> = await response.json();

  if (!response.ok) {
    throw new Error(json.message || "API request failed");
  }

  return json;
}

// ---------------------------------------------------------------------------
// Convenience methods
// ---------------------------------------------------------------------------

export const api = {
  get: <T>(path: string, options?: RequestInit) =>
    apiFetch<T>(path, { method: "GET", ...options }),

  post: <T>(path: string, body: unknown, options?: RequestInit) =>
    apiFetch<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
      ...options,
    }),

  put: <T>(path: string, body: unknown, options?: RequestInit) =>
    apiFetch<T>(path, {
      method: "PUT",
      body: JSON.stringify(body),
      ...options,
    }),

  delete: <T>(path: string, options?: RequestInit) =>
    apiFetch<T>(path, { method: "DELETE", ...options }),
};
