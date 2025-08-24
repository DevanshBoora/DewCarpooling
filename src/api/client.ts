import { BASE_URL } from '../config';

let token: string | null = null;

export const setAuthToken = (newToken: string) => {
  token = `Bearer ${newToken}`;
};

export const clearAuthToken = () => {
  token = null;
};

type UnauthorizedCb = () => void;
const unauthorizedListeners: UnauthorizedCb[] = [];
export const onUnauthorized = (cb: UnauthorizedCb) => {
  unauthorizedListeners.push(cb);
  return () => {
    const idx = unauthorizedListeners.indexOf(cb);
    if (idx >= 0) unauthorizedListeners.splice(idx, 1);
  };
};

export class ApiError extends Error {
  status: number;
  data?: any;
  constructor(message: string, status: number, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', token);
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const contentType = res.headers.get('content-type') || '';
  const rawText = await res.text();
  let data: any = undefined;
  if (rawText) {
    if (contentType.includes('application/json')) {
      try {
        data = JSON.parse(rawText);
      } catch (e) {
        data = { message: rawText };
      }
    } else {
      // Try to parse JSON even if header missing (some servers forget content-type)
      const trimmed = rawText.trim();
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
          data = JSON.parse(trimmed);
        } catch {
          data = rawText;
        }
      } else {
        data = rawText;
      }
    }
  }

  if (!res.ok) {
    if (res.status === 401) {
      // notify listeners before throwing
      unauthorizedListeners.forEach((f) => {
        try { f(); } catch {}
      });
    }
    const msg = (data && (data.message || data.error)) || `HTTP ${res.status}`;
    throw new ApiError(msg, res.status, data);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: any) => request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put:  <T>(path: string, body?: any) => request<T>(path, { method: 'PUT',  body: body ? JSON.stringify(body) : undefined }),
  del:  <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
