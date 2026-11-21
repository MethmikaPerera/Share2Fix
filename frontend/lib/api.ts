import { auth } from './firebase';

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api').replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: { field: string; message: string }[],
  ) {
    super(message);
  }
}

interface Options {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  form?: FormData;
  /** Attach the Firebase ID token when a user is signed in (default true). */
  auth?: boolean;
  signal?: AbortSignal;
}

async function request<T>(path: string, opts: Options = {}): Promise<{ data: T; meta?: { nextCursor?: string | null; limit?: number } }> {
  const headers: Record<string, string> = {};
  if (opts.auth !== false && auth.currentUser) {
    headers.Authorization = `Bearer ${await auth.currentUser.getIdToken()}`;
  }
  let body: BodyInit | undefined;
  if (opts.form) {
    body = opts.form;
  } else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { method: opts.method ?? 'GET', headers, body, signal: opts.signal });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the server. Check your connection and that the API is running.');
  }

  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    const e = json?.error;
    throw new ApiError(res.status, e?.code ?? 'UNKNOWN', e?.message ?? `Request failed (${res.status})`, e?.details);
  }
  return { data: json.data as T, meta: json.meta };
}

export const api = {
  get: async <T>(path: string, signal?: AbortSignal) => (await request<T>(path, { signal })).data,
  /** Public GET that does not require a signed-in user. */
  getPublic: async <T>(path: string, signal?: AbortSignal) => (await request<T>(path, { signal })).data,
  list: async <T>(path: string, signal?: AbortSignal) => {
    const { data, meta } = await request<T[]>(path, { signal });
    return { items: data, nextCursor: meta?.nextCursor ?? null };
  },
  post: async <T>(path: string, body?: unknown) => (await request<T>(path, { method: 'POST', body: body ?? {} })).data,
  patch: async <T>(path: string, body: unknown) => (await request<T>(path, { method: 'PATCH', body })).data,
  delete: async <T>(path: string) => (await request<T>(path, { method: 'DELETE' })).data,
  postForm: async <T>(path: string, form: FormData) => (await request<T>(path, { method: 'POST', form })).data,
};

export const errorMessage = (e: unknown, fallback = 'Something went wrong. Please try again.') =>
  e instanceof ApiError ? e.message : e instanceof Error ? e.message : fallback;

export function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  const s = sp.toString();
  return s ? `?${s}` : '';
}
