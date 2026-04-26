import { writable, derived } from 'svelte/store';
import { getUsuario, isAuthenticated, logout } from '../api/auth';
import type { UsuarioInfo } from '../types';

interface AuthState {
  authenticated: boolean;
  user: UsuarioInfo | null;
}

function createAuthStore() {
  const { subscribe, set } = writable<AuthState>({
    authenticated: isAuthenticated(),
    user: getUsuario(),
  });

  return {
    subscribe,
    refresh() {
      set({ authenticated: isAuthenticated(), user: getUsuario() });
    },
    logout() {
      logout();
      set({ authenticated: false, user: null });
    },
  };
}

export const authStore = createAuthStore();
export const isAdmin = derived(authStore, ($a) => $a.user?.rol === 'admin');
