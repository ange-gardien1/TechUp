import { Platform } from 'react-native';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  (Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://127.0.0.1:4000');

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers ?? {});
  const hasBody = typeof init.body === 'string' || init.body instanceof FormData;

  if (hasBody && !headers.has('Content-Type') && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  const responseText = await response.text();
  const data = responseText ? JSON.parse(responseText) : null;

  if (!response.ok) {
    const message =
      typeof data === 'object' && data && 'error' in data && typeof data.error === 'string'
        ? data.error
        : `Request failed (${response.status})`;

    throw new Error(message);
  }

  return data as T;
}
