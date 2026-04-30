import { apiPost, resetLogoutFlag } from './base';
import type { UsuarioInfo } from '../types';

interface LoginResponse {
  ok: boolean;
  token?: string;
  expiraEn?: number;
  usuario?: UsuarioInfo;
  data?: {
    token?: string;
    expiraEn?: number;
    usuario?: UsuarioInfo;
  };
  error?: string;
}

export async function login(usuario: string, password: string): Promise<{ ok: boolean; error?: string }> {
  const res = await apiPost<LoginResponse>(
    '/auth/login',
    { nombreUsuario: usuario, password },
    false
  );
  const body = res as LoginResponse;
  const payload = body.data ?? body;
  const token = payload.token;
  if (!body.ok || !token) return { ok: false, error: body.error ?? 'Error al iniciar sesión' };

  const expiry = Math.floor(Date.now() / 1000) + (payload.expiraEn ?? 1800);
  localStorage.setItem('origen_token', token);
  localStorage.setItem('origen_user', JSON.stringify(payload.usuario));
  localStorage.setItem('origen_expiry', String(expiry));
  resetLogoutFlag();
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
