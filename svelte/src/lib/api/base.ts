import type { ApiResponse } from '../types';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

function getToken(): string | null {
  try {
    const expiry = localStorage.getItem('origen_expiry');
    if (expiry && Date.now() / 1000 > Number(expiry)) {
      localStorage.removeItem('origen_token');
      localStorage.removeItem('origen_user');
      localStorage.removeItem('origen_expiry');
      window.location.hash = '#/login';
      return null;
    }
    return localStorage.getItem('origen_token');
  } catch {
    return null;
  }
}

function headers(auth = true): HeadersInit {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) h['Authorization'] = `Bearer ${token}`;
  }
  return h;
}

async function handle401(): Promise<void> {
  localStorage.removeItem('origen_token');
  localStorage.removeItem('origen_user');
  localStorage.removeItem('origen_expiry');
  window.location.hash = '#/login';
}

export async function apiGet<T>(path: string, auth = true): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${API_BASE}${path}`, { headers: headers(auth) });
    if (res.status === 401) { await handle401(); return { ok: false, error: 'No autorizado' }; }
    const json = await res.json();
    return json as ApiResponse<T>;
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export async function apiPost<T>(path: string, body: unknown, auth = true): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: headers(auth),
      body: JSON.stringify(body),
    });
    if (res.status === 401) { await handle401(); return { ok: false, error: 'No autorizado' }; }
    const json = await res.json();
    return json as ApiResponse<T>;
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export async function apiPut<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify(body),
    });
    if (res.status === 401) { await handle401(); return { ok: false, error: 'No autorizado' }; }
    const json = await res.json();
    return json as ApiResponse<T>;
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export async function apiDelete<T>(path: string): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${API_BASE}${path}`, { method: 'DELETE', headers: headers() });
    if (res.status === 401) { await handle401(); return { ok: false, error: 'No autorizado' }; }
    const json = await res.json();
    return json as ApiResponse<T>;
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
