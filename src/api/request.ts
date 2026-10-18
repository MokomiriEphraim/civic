/**
 * Base URL for API requests. In local development, the Vite proxy forwards
 * `/api` to `localhost:3001` so this stays empty. In production on Render
 * (or any split-service deploy), set `VITE_API_URL` to the API service URL
 * (e.g. `https://civicfix-api.onrender.com`) so the static site can reach it.
 */
const API_BASE = (
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || ''
).replace(/\/+$/, '');

/**
 * Shared fetch wrapper: JSON in, JSON out, and a thrown Error carrying the
 * server's `error` message so views can render it directly.
 */
export async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }

  if (!response.ok) {
    const message =
      typeof body === 'object' && body !== null && 'error' in body &&
      typeof body.error === 'string'
        ? body.error
        : text && text.length < 200
          ? text
          : `Request failed with status ${response.status}.`;
    throw new Error(message);
  }

  return (body ?? {}) as T;
}

export function post<T>(url: string, body: unknown): Promise<T> {
  return request<T>(url, { method: 'POST', body: JSON.stringify(body) });
}

export function patch<T>(url: string, body: unknown): Promise<T> {
  return request<T>(url, { method: 'PATCH', body: JSON.stringify(body) });
}

export function put<T>(url: string, body: unknown): Promise<T> {
  return request<T>(url, { method: 'PUT', body: JSON.stringify(body) });
}

export function del<T = void>(url: string): Promise<T> {
  return request<T>(url, { method: 'DELETE' });
}
