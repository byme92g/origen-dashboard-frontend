import { apiPost } from './base';
import type { UsuarioInfo } from '../types';

interface LoginResponse {
  ok: boolean;
  token?: string;
  expiraEn?: number;
  usuario?: UsuarioInfo;
  error?: string;
}

export async function login(usuario: string, password: string): Promise<{ ok: boolean; error?: string }> {
  const res = await apiPost<LoginResponse>(
    '/api/auth/login',
    { nombreUsuario: usuario, password },
    false
  );
  // Backend returns { ok, token, expiraEn, usuario } at root level (not nested under data)
  const body = (res.data ?? res) as LoginResponse;
  if (!body.ok || !body.token) return { ok: false, error: body.error ?? 'Error al iniciar sesión' };

  const expiry = Math.floor(Date.now() / 1000) + (body.expiraEn ?? 1800);
  localStorage.setItem('origen_token', body.token);
  localStorage.setItem('origen_user', JSON.stringify(body.usuario));
  localStorage.setItem('origen_expiry', String(expiry));
  return { ok: true };
}

export function logout(): void {
  localStorage.removeItem('origen_token');
  localStorage.removeItem('origen_user');
  localStorage.removeItem('origen_expiry');
}

export function getUsuario(): UsuarioInfo | null {
  try {
    const raw = localStorage.getItem('origen_user');
    return raw ? (JSON.parse(raw) as UsuarioInfo) : null;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  const token = localStorage.getItem('origen_token');
  const expiry = localStorage.getItem('origen_expiry');
  if (!token || !expiry) return false;
  return Date.now() / 1000 < Number(expiry);
}
