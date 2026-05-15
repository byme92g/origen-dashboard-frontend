import { writable } from 'svelte/store';

type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

export const toasts = writable<ToastItem[]>([]);
let counter = 0;

/** duration=0 → no auto-dismiss (manual close only) */
export function toast(message: string, type: ToastType = 'info', duration = 3500) {
  const id = ++counter;
  toasts.update((t) => [...t, { id, message, type }]);
  if (duration > 0) {
    setTimeout(() => toasts.update((t) => t.filter((x) => x.id !== id)), duration);
  }
}
