import { writable } from 'svelte/store';

const STORAGE_KEY = 'origen_permisos';

function loadFromStorage(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function createPermisosStore() {
  const { subscribe, set } = writable<string[]>(loadFromStorage());

  return {
    subscribe,
    set(rutas: string[]) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rutas));
      set(rutas);
    },
    clear() {
      localStorage.removeItem(STORAGE_KEY);
      set([]);
    },
    refresh() {
      set(loadFromStorage());
    },
  };
}

export const permisosStore = createPermisosStore();
