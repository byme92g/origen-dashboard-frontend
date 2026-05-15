import { writable } from 'svelte/store';
import type { Campana } from '../types';

// When set, Ingresos wizard opens and pre-loads the campaign item
export const campanaPreseleccionada = writable<Campana | null>(null);
