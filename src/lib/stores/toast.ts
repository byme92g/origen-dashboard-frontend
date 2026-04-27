import { writable } from 'svelte/store';

type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

export const toasts = writable<ToastItem[]>([]);
let counter = 0;

export function toast(message: string, type: ToastType = 'info') {
  const id = ++counter;
  toasts.update((t) => [...t, { id, message, type }]);
  setTimeout(() => toasts.update((t) => t.filter((x) => x.id !== id)), 3500);
}
