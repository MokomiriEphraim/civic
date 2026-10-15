/**
 * Shared fetch wrapper: JSON in, JSON out, and a thrown Error carrying the
 * server's `error` message so views can render it directly.
 */
export async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  const body: unknown = await response.json();

  if (!response.ok) {
    const message =
      typeof body === 'object' && body !== null && 'error' in body &&
      typeof body.error === 'string'
        ? body.error
        : `Request failed with status ${response.status}.`;
    throw new Error(message);
  }

  return body as T;
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
