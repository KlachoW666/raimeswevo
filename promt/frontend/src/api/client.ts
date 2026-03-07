import { CONFIG } from '../config';

// Базовый URL API: из .env (VITE_APP_URL) или текущий origin. Критично для работы с телефона.
const base = CONFIG.API_BASE || (typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '');

const REQUEST_TIMEOUT_MS = 15000;

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = path.startsWith('http') ? path : `${base}${path}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
  } catch (e) {
    clearTimeout(timeoutId);
    if (e instanceof Error && e.name === 'AbortError') throw new Error('Таймаут. Проверьте интернет.');
    throw e;
  }
  clearTimeout(timeoutId);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const d = data as { error?: string; message?: string; detail?: string };
    const statusText = res.statusText || (res.status === 502 ? 'Bad Gateway' : '');
    const err = new Error(d.message || d.error || statusText);
    if (d.detail) (err as Error & { detail?: string }).detail = d.detail;
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
};
