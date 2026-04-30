import type { ApiResponse } from '../types';
import { config } from '../config';

const API_BASE = `${config.apiUrl}${config.apiPrefix}`;

export function getToken(): string | null {
  try {
    const expiry = localStorage.getItem('origen_expiry');
    if (expiry && Date.now() / 1000 > Number(expiry)) {
      localStorage.removeItem('origen_token');
      localStorage.removeItem('origen_user');
      localStorage.removeItem('origen_expiry');
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

let loggingOut = false;

export function resetLogoutFlag(): void {
  loggingOut = false;
}

async function handle401(): Promise<void> {
  if (loggingOut) return;
  loggingOut = true;
  localStorage.removeItem('origen_token');
  localStorage.removeItem('origen_user');
  localStorage.removeItem('origen_expiry');
  window.location.hash = '#/login';
}

function firstValidationError(errors: unknown): string | null {
  if (!errors || typeof errors !== 'object') return null;
  for (const value of Object.values(errors as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length > 0) return String(value[0]);
  }
  return null;
}

const dotnetAutoMsg = /^The .+ field is required\.$/i;

function humanError(status: number, fallback?: string): string {
  const msg = fallback && !dotnetAutoMsg.test(fallback) ? fallback : undefined;
  if (status === 400) return msg ?? 'Revisa los datos ingresados. Hay un valor inválido o incompleto.';
  if (status === 401) return 'Tu sesión venció o no tienes autorización. Vuelve a iniciar sesión.';
  if (status === 403) return 'No tienes permiso para realizar esta acción.';
  if (status === 404) return msg ?? 'No se encontró el registro solicitado.';
  if (status >= 500) return msg ?? 'Hubo un error de procesamiento. Contacta al administrador si el problema continúa.';
  return msg ?? 'No se pudo completar la operación. Inténtalo nuevamente.';
}

async function parseResponse<T>(res: Response): Promise<ApiResponse<T>> {
  const text = await res.text();
  if (!text) return res.ok ? { ok: true } : { ok: false, error: humanError(res.status) };

  try {
    const json = JSON.parse(text);
    if (res.ok) return json as ApiResponse<T>;

    const validation = firstValidationError(json.errors);
    const message = json.error ?? validation ?? json.title ?? json.message;
    return { ok: false, error: humanError(res.status, message) };
  } catch {
    return res.ok
      ? { ok: false, error: 'El servidor devolvió una respuesta inválida.' }
      : { ok: false, error: humanError(res.status, text) };
  }
}

export async function apiGet<T>(path: string, auth = true): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${API_BASE}${path}`, { headers: headers(auth) });
    if (res.status === 401) { await handle401(); return { ok: false, error: 'No autorizado' }; }
    return parseResponse<T>(res);
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
    return parseResponse<T>(res);
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
    return parseResponse<T>(res);
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export async function apiDelete<T>(path: string): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${API_BASE}${path}`, { method: 'DELETE', headers: headers() });
    if (res.status === 401) { await handle401(); return { ok: false, error: 'No autorizado' }; }
    return parseResponse<T>(res);
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export async function apiDownload(path: string): Promise<{ ok: boolean; blob?: Blob; filename?: string; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}${path}`, { headers: headers() });
    if (res.status === 401) { await handle401(); return { ok: false, error: 'No autorizado' }; }
    if (!res.ok) return { ok: false, error: humanError(res.status) };

    const disposition = res.headers.get('content-disposition') ?? '';
    const match = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(disposition);
    const filename = match ? decodeURIComponent(match[1].replace(/"/g, '')) : undefined;
    return { ok: true, blob: await res.blob(), filename };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
